import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback order: Primary high-performance model -> Secondary fast models
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Executes prompt with instant model failover upon hitting 503/429 capacity limits.
 */
async function extractBillingWithFallback(prompt: string) {
  let lastError: any = null;

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelName = FALLBACK_MODELS[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
        },
      });

      return await model.generateContent(prompt);
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const msg = error?.message || '';

      const isCapacityError =
        status === 503 ||
        status === 429 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');

      const isLastModel = i === FALLBACK_MODELS.length - 1;

      if (isCapacityError && !isLastModel) {
        console.warn(
          `[Fallback] Model '${modelName}' hit high demand (${status || '503'}). Instantly switching to '${FALLBACK_MODELS[i + 1]}'...`
        );
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

const VALID_TYPES = ['ICD-10', 'CPT'];
const VALID_CONFIDENCE = ['high', 'medium', 'low'];

/**
 * Strips markdown code fences the model may wrap the JSON in, then parses
 * the first array found in the response.
 */
function parseCodes(responseText: string) {
  const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) return [];

  const parsed = JSON.parse(cleaned.substring(start, end + 1));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item: any) =>
        item &&
        typeof item.code === 'string' &&
        VALID_TYPES.includes(item.type)
    )
    .map((item: any) => ({
      code: item.code,
      type: item.type,
      description: typeof item.description === 'string' ? item.description : '',
      confidence: VALID_CONFIDENCE.includes(item.confidence) ? item.confidence : 'low',
    }));
}

export async function POST(req: Request) {
  try {
    const { soapNote, specialty } = await req.json();

    if (!soapNote || soapNote.length < 10) {
      return NextResponse.json(
        { message: "SOAP note is missing or too short." },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert medical coder for Align. Extract the billing codes implied by the following SOAP note.

Specialty: ${specialty || 'General Practice'}

REQUIREMENTS:
1. Extract diagnostic codes (ICD-10) for the conditions documented, and procedure codes (CPT) for the services documented.
2. Only include codes that are clearly supported by the note content. Do NOT invent diagnoses or procedures.
3. Set "confidence" to "high", "medium" or "low" based on how explicitly the note supports the code.
4. Keep each "description" to a short clinical label (under 60 characters).
5. Respond with valid JSON only, nothing else — no markdown, no commentary.

Respond with a JSON array in exactly this shape:
[{"code": "J06.9", "type": "ICD-10", "description": "Acute upper respiratory infection", "confidence": "high"}]

If no codes are supported by the note, respond with [].

SOAP NOTE:
"${soapNote}"
`;

    const result = await extractBillingWithFallback(prompt);
    const responseText = result.response.text();

    let codes: ReturnType<typeof parseCodes> = [];
    try {
      codes = parseCodes(responseText);
    } catch (parseError) {
      console.error("Billing code parse error:", parseError, responseText);
      return NextResponse.json(
        { message: "AI returned an unreadable billing response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ codes });

  } catch (error: any) {
    console.error("Gemini Billing Error:", error);

    const status = error?.status || error?.response?.status || 500;
    const msg = error?.message || '';
    const isRateLimited = status === 429 || status === 503 || msg.includes('503') || msg.includes('429');

    return NextResponse.json(
      {
        message: isRateLimited
          ? "Medical AI is experiencing temporary high demand. Please retry in a few seconds."
          : "Billing code extraction failed. Please try again."
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}
