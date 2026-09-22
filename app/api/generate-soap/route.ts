// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { NextResponse } from "next/server";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// export async function POST(req: Request) {
//   try {
//     // We now extract 'language' from the request body
//     const { transcript, language } = await req.json();

//     if (!transcript || transcript.length < 10) {
//       return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
//     }

//     const model = genAI.getGenerativeModel({ 
//       //model: "gemini-3-flash-preview",
//       model: "gemini-2.0-flash",
//       generationConfig: {
//         temperature: 0.1, 
//         topP: 0.95,
//       }
//     });

//     // We define the output language based on the toggle value
//     const outputLang = language === 'tr' ? 'Turkish (Türkçe)' : 'English';

//     const prompt = `
//       You are a specialized medical scribe for Align. 
//       Convert the following clinical transcript into a structured SOAP note.
      
//       CRITICAL: The final SOAP note MUST be written entirely in ${outputLang}.

//       STRUCTURE:
//       - Subjective: Chief complaint, history of present illness, and patient's words.
//       - Objective: Vitals or physical findings mentioned.
//       - Assessment: Clinical impression or diagnosis.
//       - Plan: Next steps, medications, and follow-up.

//       FORMATTING RULES:
//       You must strictly use double asterisks to bold the main section headers and any critical sub-headers. 
//       Example:
//       **SUBJECTIVE:**
//       Patient presents with...

//       **OBJECTIVE:**
//       - **Vitals:** BP 120/80...

//       Do not use hash symbols (#) for headers, only use double asterisks (**).

//       RULES:
//       - Use professional medical terminology appropriate for ${outputLang}.
//       - If details for a section are missing, write "Not discussed" (or "Görüşülmedi" if Turkish).
//       - Do NOT hallucinate patient names or data not in the transcript.

//       TRANSCRIPT: 
//       ${transcript}
//     `;

//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const text = response.text();

//     return NextResponse.json({ soapNote: text });
//   // } catch (error: any) {
//   //   console.error("Gemini Error:", error);
//   //   return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
//   // }
//   } catch (error: any) {
//   console.error("Gemini Error:", error?.status, error?.message);
//   const isRateLimited = error?.status === 429 || error?.status === 503;
//   return NextResponse.json(
//     { error: isRateLimited ? "AI is at capacity, please retry" : "AI processing failed" },
//     { status: isRateLimited ? 429 : 500 }
//   );
// }
// }
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper for automatic exponential backoff retries on 503/429 errors
async function generateWithRetry(model: any, prompt: string, maxRetries = 3) {
  let delay = 1000; // start with 1s delay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const msg = error?.message || '';

      const isTransient = 
        status === 503 || 
        status === 429 || 
        msg.includes('503') || 
        msg.includes('429') || 
        msg.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < maxRetries) {
        console.warn(`Gemini 503/429 spike on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // 1s -> 2s -> 4s
      } else {
        throw error;
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const { transcript, language, patientName, specialty } = await req.json();

    if (!transcript) {
      return NextResponse.json({ message: "Transcript is required." }, { status: 400 });
    }

    const langMap: Record<string, string> = { 
      tr: 'Turkish (Türkçe)', 
      ar: 'Arabic (العربية)', 
      ka: 'Georgian (ქართული)' 
    };
    const outputLang = langMap[language] || 'English';

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `
You are an expert clinical scribe for Align. Generate a structured SOAP note (Subjective, Objective, Assessment, Plan) based on the provided encounter transcript.

Patient Name: ${patientName || 'N/A'}
Specialty: ${specialty || 'General Practice'}
Target Output Language: ${outputLang}

CRITICAL REQUIREMENTS:
1. The entire output MUST be written in ${outputLang}.
2. Use standard medical terminology appropriate for ${outputLang}.
3. Structure with bold markdown headers (**Subjective**, **Objective**, **Assessment**, **Plan**).

RULES:
- Use professional medical terminology appropriate for ${outputLang}.
- If details for a section are missing, write "Not discussed".
- Do NOT hallucinate patient names or data not in the transcript.

Transcript:
"${transcript}"
`;

    // Call Gemini using auto-retry
    const result = await generateWithRetry(model, prompt);
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