# Align

**AI-powered clinical documentation for multilingual healthcare.**

Align listens to ambient doctor-patient conversations and converts them into structured, editable clinical notes in real time, reducing documentation workload so doctors can focus on the patient, not the keyboard.

Built for the reality of Gulf healthcare: consultations happen in English, Arabic, Turkish, and Georgian, often within the same clinic. Most ambient scribes are tuned for English-only encounters, Align isn't.

## Features

- **Live transcription** — real-time captioning during the encounter (English, Turkish), with near-live chunked transcription for Arabic and Georgian
- **AI-generated SOAP notes** — structured clinical notes via Gemini, editable by the practitioner before saving
- **Flexible note language** — the documentation language can match the spoken language, or be set independently (e.g. an Arabic consultation documented in English)
- **AI-suggested billing codes** — ICD-10 and CPT code suggestions extracted from the note, with confidence levels
- **Doctor sign-off** — practitioner attestation and digital signature before a note is archived
- **Patient Vault** — searchable, encrypted archive of past encounters with PDF export

## Tech stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (auth + database)
- **Speech-to-text:** Deepgram (live WebSocket for English/Turkish, REST batch for Arabic/Georgian via `nova-3`)
- **Note generation:** Google Gemini API, with model fallback for reliability
- **Deployment:** Vercel

## Getting Started

First, set up your environment variables in `.env.local`:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DEEPGRAM_API_KEY=
GEMINI_API_KEY=


Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

This project is built with [Next.js](https://nextjs.org/). See the [Next.js Documentation](https://nextjs.org/docs) for more on the framework.

## Deployment

Align is deployed on [Vercel](https://vercel.com).
