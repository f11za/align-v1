import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const language = (formData.get('language') as string) || 'ar';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPGRAM_API_KEY missing in .env.local' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();

    // Fallback chain for Arabic & Georgian REST transcription
    const modelsToTry = 
      language === 'ar' ? ['general', 'nova-3', 'nova-2'] :
      language === 'ka' ? ['general', 'nova-2'] :
      ['nova-2'];

    let transcript = '';
    let lastError = '';

    for (const model of modelsToTry) {
      const params = new URLSearchParams({
        language,
        model,
        smart_format: 'true',
      });

      const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: arrayBuffer,
      });

      if (response.ok) {
        const data = await response.json();
        transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        lastError = '';
        break; // Successfully transcribed
      } else {
        lastError = await response.text();
        console.warn(`Deepgram attempt with model '${model}' failed:`, lastError);
      }
    }

    if (lastError && !transcript) {
      throw new Error(`Deepgram REST error: ${lastError}`);
    }

    return NextResponse.json({ text: transcript });
  } catch (error: any) {
    console.error('Chunk transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}