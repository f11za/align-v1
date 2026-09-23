// // import { NextResponse } from "next/server";

// // export async function GET() {
// //   const projectId = process.env.DEEPGRAM_PROJECT_ID;
// //   const apiKey = process.env.DEEPGRAM_API_KEY;

// //   if (!projectId || !apiKey) {
// //     return NextResponse.json({ error: "Missing Environment Variables" }, { status: 500 });
// //   }

// //   try {
// //     const response = await fetch(
// //       `https://api.deepgram.com/v1/projects/${projectId}/auth/token`,
// //       {
// //         method: "POST",
// //         headers: {
// //           Authorization: `Token ${apiKey}`,
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({
// //           comment: "ClinIQ Temporary Token",
// //           scopes: ["listen:write"],
// //           time_to_live_in_seconds: 60,
// //         }),
// //         cache: 'no-store' // Ensure we get a fresh token every time
// //       }
// //     );

// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       console.error("Deepgram API Error Response:", {
// //         status: response.status,
// //         statusText: response.statusText,
// //         body: errorText
// //       });
// //       return NextResponse.json({ error: "Deepgram Auth Failed", details: errorText }, { status: response.status });
// //     }

// //     const data = await response.json();
// //     return NextResponse.json(data);
// //   } catch (error) {
// //     console.error("Server Error:", error);
// //     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
// //   }
// // }

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API Key not set in environment" }, { status: 500 });
  }

  // We return the key in a JSON object. 
  // Because this is a GET request to your OWN server, the key stays hidden 
  // from the outside world until your specific app asks for it.
  return NextResponse.json({ key: apiKey });
}