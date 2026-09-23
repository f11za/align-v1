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
async function generateSOAPWithFallback(prompt: string) {
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

      // Try generating content
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

      // If capacity error occurs and alternative models remain, switch immediately
      if (isCapacityError && !isLastModel) {
        console.warn(
          `[Fallback] Model '${modelName}' hit high demand (${status || '503'}). Instantly switching to '${FALLBACK_MODELS[i + 1]}'...`
        );
        continue;
      }

      // Throw immediately for non-capacity errors or if all fallbacks failed
      throw error;
    }
  }

  throw lastError;
}

export async function POST(req: Request) {
  try {
    const { transcript, language, noteLanguage, patientName, specialty } = await req.json();

    if (!transcript || transcript.length < 10) {
      return NextResponse.json(
        { message: "Transcript is missing or too short." }, 
        { status: 400 }
      );
    }

    // Explicit language mapping
    const langMap: Record<string, string> = { 
      tr: 'Turkish (Türkçe)', 
      ar: 'Arabic (العربية)', 
      ka: 'Georgian (ქართული)' 
    };
    //const outputLang = langMap[language] || 'English';
    const outputLang = noteLanguage === 'en' ? 'English' : (langMap[language] || 'English');
    const notDiscussedText = language === 'tr' ? 'Görüşülmedi' : 'Not discussed';

    const prompt = `
You are an expert clinical scribe for Align. Convert the following clinical transcript into a structured SOAP note.

Patient Name: ${patientName || 'N/A'}
Specialty: ${specialty || 'General Practice'}
Target Output Language: ${outputLang}

CRITICAL REQUIREMENTS:
1. The entire output MUST be written in ${outputLang}.
2. Use standard medical terminology appropriate for ${outputLang}.
3. Structure strictly using double asterisks for bold section headers (**SUBJECTIVE**, **OBJECTIVE**, **ASSESSMENT**, **PLAN**). Do NOT use hash symbols (#).

RULES:
- If details for a section are missing, write "${notDiscussedText}".
- Do NOT hallucinate patient names or clinical data not in the transcript.

TRANSCRIPT:
"${transcript}"
`;

    // Execute with instant fallback
    const result = await generateSOAPWithFallback(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ soapNote: responseText });

  } catch (error: any) {
    console.error("Gemini Final Error:", error);

    const status = error?.status || error?.response?.status || 500;
    const msg = error?.message || '';
    const isRateLimited = status === 429 || status === 503 || msg.includes('503') || msg.includes('429');

    return NextResponse.json(
      { 
        message: isRateLimited 
          ? "Medical AI is experiencing temporary high demand. Please retry in a few seconds." 
          : "AI processing failed. Please try again." 
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}