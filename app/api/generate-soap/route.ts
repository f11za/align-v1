import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    // We now extract 'language' from the request body
    const { transcript, language } = await req.json();

    if (!transcript || transcript.length < 10) {
      return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.1, 
        topP: 0.95,
      }
    });

    // We define the output language based on the toggle value
    const outputLang = language === 'tr' ? 'Turkish (Türkçe)' : 'English';

    const prompt = `
      You are a specialized medical scribe for Align. 
      Convert the following clinical transcript into a structured SOAP note.
      
      CRITICAL: The final SOAP note MUST be written entirely in ${outputLang}.

      STRUCTURE:
      - Subjective: Chief complaint, history of present illness, and patient's words.
      - Objective: Vitals or physical findings mentioned.
      - Assessment: Clinical impression or diagnosis.
      - Plan: Next steps, medications, and follow-up.

      FORMATTING RULES:
      You must strictly use double asterisks to bold the main section headers and any critical sub-headers. 
      Example:
      **SUBJECTIVE:**
      Patient presents with...

      **OBJECTIVE:**
      - **Vitals:** BP 120/80...

      Do not use hash symbols (#) for headers, only use double asterisks (**).

      RULES:
      - Use professional medical terminology appropriate for ${outputLang}.
      - If details for a section are missing, write "Not discussed" (or "Görüşülmedi" if Turkish).
      - Do NOT hallucinate patient names or data not in the transcript.

      TRANSCRIPT: 
      ${transcript}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ soapNote: text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}