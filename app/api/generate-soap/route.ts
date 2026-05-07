import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize with your key from .env.local
//const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || transcript.length < 10) {
      return NextResponse.json({ error: "Transcript too short" }, { status: 400 });
    }

    //const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash" });
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      // Adding generationConfig ensures the AI stays focused on medical structure
      generationConfig: {
        temperature: 0.1, // Keep it precise for medical notes
        topP: 0.95,
      }
    });

    const prompt = `
      You are a specialized medical scribe for Align. 
      Convert the following clinical transcript into a structured SOAP note.
      
      STRUCTURE:
      - Subjective: Chief complaint, history of present illness, and patient's words.
      - Objective: Vitals or physical findings mentioned.
      - Assessment: Clinical impression or diagnosis.
      - Plan: Next steps, medications, and follow-up.

      RULES:
      - Use professional medical terminology.
      - If details for a section are missing, write "Not discussed."
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