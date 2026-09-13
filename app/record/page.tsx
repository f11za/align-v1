'use client'

import { Suspense, useState, useRef } from 'react'
import { createClient as createDeepgramClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { useRouter, useSearchParams } from 'next/navigation'
// Use your project's existing client utility instead of the deprecated library
import { createClient as createSupabaseClient } from '@/utils/supabase/client'; 

// Add this right below your imports
const formatSoapText = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    // Split by ** to find bold sections
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} className="block mb-2">
        {parts.map((part, j) => 
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </span>
    );
  });
};

// The component that reads useSearchParams() must be rendered
// inside a Suspense boundary.
function RecordContent() {
  const router = useRouter();
  const supabase = createSupabaseClient(); // Consistent with your Signup/Login pages

  const searchParams = useSearchParams();
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');
  const specialty = searchParams.get('specialty');
  const patientId = searchParams.get('patientId');
  
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [hasConsent, setHasConsent] = useState(false)
  const [soapNote, setSoapNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Language Toggle State
  const [language, setLanguage] = useState<'en' | 'tr'>('en');

  // 1. Add a new state to track if the note was touched
  const [isEdited, setIsEdited] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const socketRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // 2. Update your onChange to set the 'isEdited' flag to true
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSoapNote(e.target.value);
    if (!isEdited) setIsEdited(true); // Once they type, it's officially 'edited'
  };

  // 1. GENERATE SOAP (with Gemini Retry Logic)
  const generateSOAP = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-soap', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript,
          language: language, // Changed 'lang' to 'language' to match your API route
          patientName: `${firstName} ${lastName}`,
          specialty: specialty
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gemini is busy.");
      }

      const data = await response.json();
      setSoapNote(data.soapNote);
    } catch (err: any) {
      console.error(err);
      setError("Medical AI is under high demand. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. SAVE TO DATABASE (The "Fully Secure" Link)
  const handleSave = async () => {
    if (!soapNote) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return router.push('/login');

      const { error: saveError } = await supabase
        .from('soap_notes')
        .insert([
          { 
            practitioner_id: user.id, 
            raw_ai_output: soapNote,
            patient_id: patientId,
            is_edited: isEdited, // THIS IS THE KEY FLAG
            subjective: "Transcribed session",
            objective: "See raw output",
            assessment: "See raw output",
            plan: "See raw output",
          },
        ]);

      if (saveError) {
        alert("Database Error: " + saveError.message);
      } else {
        alert("Note archived in Patient Vault!");
        router.push('/dashboard');
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. DEEPGRAM LOGIC
  const startSession = async () => {
    if (!hasConsent) return alert("Patient consent is required.")

    const authRes = await fetch('/api/authenticate')
    const data = await authRes.json()
    const token = data.token || data.key

    if (!token) return console.error("Auth failed");

    const deepgram = createDeepgramClient(token)
    
    // LOGIC FIX: Use 'nova-2-medical' for English, but 'nova-2' for Turkish
    const modelToUse = language === 'tr' ? 'nova-2' : 'nova-2-medical';

    const connection = deepgram.listen.live({
      model: modelToUse, // Now dynamic!
      interim_results: true,
      smart_format: true,
      language: language,
    })

    socketRef.current = connection

    connection.on(LiveTranscriptionEvents.Open, () => {
      setIsRecording(true);
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };
        mediaRecorder.start(250);
      });
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const received = data.channel.alternatives[0].transcript;
      if (data.is_final && received !== "") {
        setTranscript((prev) => prev + " " + received);
      }
    });
  }

  const stopSession = async () => {
    mediaRecorderRef.current?.stop();
    socketRef.current?.finish();
    setIsRecording(false);

    if (transcript.trim().length > 10) {
      await generateSOAP();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-slate-50/30">
      {/* 1. UPGRADED HEADER WITH PATIENT CONTEXT */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-sage-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Align Scribe</h1>
          {/* Dynamically show patient info if it exists from the Intake page */}
          {(firstName || lastName) && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold text-slate-600">
                Patient: {firstName} {lastName}
              </span>
              {specialty && (
                <span className="bg-sage-primary/10 text-sage-primary border border-sage-primary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {specialty}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-sage-border shadow-sm">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-slate-300"}`} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {isRecording ? "Live Recording" : "Standby"}
          </span>
        </div>
      </header>

      {!soapNote && !error ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {!isRecording && (
            <div className="bg-white border border-sage-border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
              <label className="flex items-start gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-5 h-5 rounded border-sage-border text-sage-primary focus:ring-sage-primary transition-all"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                />
                <span className="text-slate-800 font-medium leading-tight text-sm">
                  I confirm verbal consent for this clinical recording.
                  <p className="text-[11px] text-slate-400 mt-1.5 font-semibold uppercase tracking-wider">Required for Patient Safety & HIPAA Compliance</p>
                </span>
              </label>
            </div>
          )}

          {/* Language Toggle */}
          {!isRecording && (
            <div className="flex justify-center gap-3 mb-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  language === 'en'
                    ? 'bg-sage-primary text-white scale-105'
                    : 'bg-white border border-sage-border text-slate-400 hover:bg-slate-50'
                }`}
              >
                ENGLISH
              </button>

              <button 
                onClick={() => setLanguage('tr')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  language === 'tr'
                    ? 'bg-sage-primary text-white scale-105'
                    : 'bg-white border border-sage-border text-slate-400 hover:bg-slate-50'
                }`}
              >
                TÜRKÇE
              </button>
            </div>
          )}

          <div className="bg-white border-2 border-sage-border rounded-3xl p-8 min-h-[400px] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sage-light via-sage-primary to-sage-light opacity-50"></div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-2">Transcription Feed</p>
            <p className="text-slate-700 text-lg leading-relaxed font-medium">
              {transcript || <span className="text-slate-400 italic">The clinical feed will appear here once the encounter begins...</span>}
            </p>
          </div>

          <button 
            onClick={isRecording ? stopSession : startSession}
            disabled={isGenerating || (!isRecording && !hasConsent)}
            className={`w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 transform active:scale-[0.98] ${
              isRecording 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/25" 
                : "bg-sage-primary hover:bg-sage-dark disabled:bg-slate-200 disabled:shadow-none disabled:transform-none"
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing AI Insight...
              </span>
            ) : isRecording ? "End Session & Generate SOAP" : "Start Encounter"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700">
          {/* Left Side: Transcript */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-400 uppercase text-[11px] tracking-[0.15em] ml-2">Encounter Transcript</h3>
            <div className="bg-white p-6 rounded-3xl border border-sage-border text-slate-600 h-[650px] overflow-y-auto leading-relaxed text-sm shadow-sm">
              {transcript || "No transcript data available."}
            </div>
          </div>

          {/* Right Side: AI SOAP Note (Document Style) */}
          <div className="space-y-3">
            <div className="flex justify-between items-end ml-2">
              <h3 className="font-bold text-sage-primary uppercase text-[11px] tracking-[0.15em]">Structured Clinical Note</h3>
              {isEditMode && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider animate-pulse">● Editing Mode</span>}
            </div>
            
            {error ? (
              <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center space-y-4 h-[650px] flex flex-col justify-center shadow-sm">
                <p className="text-red-800 text-sm font-medium">{error}</p>
                <button onClick={generateSOAP} className="bg-sage-primary text-white px-6 py-3 rounded-xl font-bold text-sm self-center hover:opacity-90 transition-all shadow-md">
                  Retry AI Generation
                </button>
              </div>
            ) : (
              <div className={`flex flex-col h-[650px] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm ${isEditMode ? 'ring-2 ring-amber-300 border-transparent shadow-md' : 'border border-sage-border bg-white'}`}>
                
                {/* Document Header Bar */}
                <div className={`px-6 py-3 border-b flex justify-between items-center ${isEditMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-sage-border'}`}>
                  <span className="text-xs font-bold text-slate-500">
                    {specialty ? `${specialty} Department` : 'General Practice'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* <textarea 
                  value={soapNote.replace(/[#*]/g, "").trim()} 
                  onChange={handleTextChange}
                  readOnly={!isEditMode}
                  className={`flex-1 w-full p-6 text-sm font-sans leading-relaxed resize-none outline-none transition-colors
                    ${isEditMode ? 'bg-white text-slate-800' : 'bg-slate-50/50 text-slate-700'}`}
                  placeholder="AI structured output will appear here..."
                /> */}
                {isEditMode ? (
                  <textarea 
                    value={soapNote} // Notice we removed the .replace() so we keep the asterisks!
                    onChange={handleTextChange}
                    className="flex-1 w-full p-6 text-sm font-sans leading-relaxed resize-none outline-none transition-colors bg-white text-slate-800"
                    placeholder="AI structured output will appear here..."
                  />
                ) : (
                  <div className="flex-1 w-full p-6 text-sm font-sans leading-relaxed overflow-y-auto transition-colors bg-slate-50/50 text-slate-700">
                    {soapNote ? formatSoapText(soapNote) : <span className="text-slate-400 italic">AI structured output will appear here...</span>}
                  </div>
                )}
                {/* ----------------------------------------------- */}
              </div>
            )}

            {!error && (
              <>
                <div className="flex gap-3 mt-4">
                  {!isEditMode ? (
                    <button 
                      onClick={() => setIsEditMode(true)}
                      className="flex-1 bg-white border border-sage-primary text-sage-primary py-4 rounded-2xl font-bold hover:bg-sage-50 transition-all text-sm shadow-sm"
                    >
                      Edit Note
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 bg-amber-100 text-amber-700 py-4 rounded-2xl font-bold hover:bg-amber-200 transition-all text-sm shadow-sm"
                    >
                      Lock Edits
                    </button>
                  )}

                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-[2] bg-sage-primary text-white py-4 rounded-2xl font-bold shadow-md hover:bg-sage-dark transition-all disabled:bg-slate-300 text-sm transform active:scale-[0.98]"
                  >
                    {loading ? "Archiving to Vault..." : "Verify & Save to Vault"}
                  </button>
                </div>

                <button 
                  onClick={() => {setSoapNote(""); setTranscript(""); setError(null); setIsEdited(false); setIsEditMode(false);}}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-all text-xs uppercase tracking-wider"
                >
                  Discard Encounter
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Keep useSearchParams() behind Suspense so Next.js can prerender /record
// successfully during the production build.
export default function RecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading session...</div>}>
      <RecordContent />
    </Suspense>
  )
}
