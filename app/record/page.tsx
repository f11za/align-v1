'use client'

import { useState, useRef } from 'react'
import { createClient as createDeepgramClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { useRouter } from 'next/navigation';
// Use your project's existing client utility instead of the deprecated library
import { createClient as createSupabaseClient } from '@/utils/supabase/client'; 

export default function RecordPage() {
  const router = useRouter();
  const supabase = createSupabaseClient(); // Consistent with your Signup/Login pages
  
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [hasConsent, setHasConsent] = useState(false)
  const [soapNote, setSoapNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const socketRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // 1. GENERATE SOAP (with Gemini Retry Logic)
  const generateSOAP = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-soap', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Catch the 503 Service Unavailable here
        throw new Error(errorData.message || "Gemini is busy.");
      }

      const data = await response.json();
      setSoapNote(data.soapNote);
    } catch (err: any) {
      console.error(err);
      setError("Medical AI is under high demand. Please try again or check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. SAVE TO DATABASE (The "Fully Secure" Link)
  // const handleSave = async () => {
  //   if (!soapNote) return;
  //   setLoading(true);

  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();

  //     if (!user) {
  //       alert("Session expired. Please log in again.");
  //       return router.push('/login');
  //     }

  //     const { error: saveError } = await supabase
  //       .from('soap_notes')
  //       .insert([
  //         { 
  //           practitioner_id: user.id, // THE CRITICAL LINK
  //           content: soapNote, 
  //           transcript: transcript,
  //           patient_name: "New Patient Encounter" // Optional: Add an input field for this later
  //         },
  //       ]);

  //     if (saveError) {
  //       alert("Database Error: " + saveError.message);
  //     } else {
  //       alert("Note archived in Patient Vault!");
  //       router.push('/dashboard');
  //     }
  //   } catch (err) {
  //     console.error("Save error:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
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
          raw_ai_output: soapNote, // Matches your DB column
          subjective: "See raw output", // Temporary placeholders to satisfy the schema
          objective: "See raw output",
          assessment: "See raw output",
          plan: "See raw output",
          // Note: 'transcript' isn't in your column list, 
          // so we'll leave it out for now or add it to DB later
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
    const connection = deepgram.listen.live({
      model: "nova-2-medical",
      interim_results: true,
      smart_format: true,
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
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-white">
      {/* UI Remains the same as your Sage & Stone layout */}
      <header className="flex justify-between items-center mb-8 border-b border-sage-border pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Align Scribe</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {isRecording ? "Live Recording" : "Standby"}
          </span>
        </div>
      </header>

      {!soapNote && !error ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {!isRecording && (
            <div className="bg-slate-50/50 border-2 border-sage-border rounded-xl p-5 shadow-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 w-5 h-5 rounded border-sage-border text-sage-primary focus:ring-sage-primary"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                />
                <span className="text-slate-800 font-medium leading-tight text-sm">
                  I confirm verbal consent for this clinical recording.
                  <p className="text-[10px] text-slate-400 mt-1 font-normal uppercase tracking-tighter">Required for UAE MOHAP Compliance</p>
                </span>
              </label>
            </div>
          )}

          <div className="bg-slate-50 border-2 border-sage-border rounded-3xl p-8 min-h-[400px] shadow-inner relative">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Transcription Feed</p>
            <p className="text-slate-700 text-lg leading-relaxed font-medium italic">
              {transcript || "The feed will appear here once the encounter begins..."}
            </p>
          </div>

          <button 
            onClick={isRecording ? stopSession : startSession}
            disabled={isGenerating || (!isRecording && !hasConsent)}
            className={`w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all ${
              isRecording 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-sage-primary hover:opacity-90 disabled:bg-slate-200"
            }`}
          >
            {isGenerating ? "Processing AI Insight..." : isRecording ? "End Session & Generate SOAP" : "Start Encounter"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Left Side: Transcript */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest ml-1">Encounter Transcript</h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-sage-border text-slate-600 h-[600px] overflow-y-auto leading-relaxed text-sm shadow-inner">
              {transcript || "No transcript data available."}
            </div>
          </div>

          {/* Right Side: AI SOAP Note */}
          <div className="space-y-4">
            <h3 className="font-bold text-sage-primary uppercase text-[10px] tracking-widest ml-1">Structured SOAP Note</h3>
            
            {error ? (
              <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center space-y-4 h-[600px] flex flex-col justify-center">
                <p className="text-red-800 text-sm font-medium">{error}</p>
                <button onClick={generateSOAP} className="bg-sage-primary text-white px-6 py-2 rounded-lg font-bold text-sm self-center">
                  Retry AI
                </button>
              </div>
            ) : (
              <textarea 
                value={soapNote.replace(/\*\*/g, "")}
                onChange={(e) => setSoapNote(e.target.value)}
                /* These classes now mirror the transcript box exactly */
                className="w-full h-[600px] p-6 bg-slate-50 border border-sage-border rounded-2xl shadow-inner focus:ring-1 focus:ring-sage-primary/30 text-slate-700 leading-relaxed text-sm resize-none outline-none font-sans"
                placeholder="AI structured output will appear here..."
              />
            )}

            {!error && (
              <div className="flex gap-3">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-[2] bg-sage-primary text-white py-4 rounded-xl font-bold shadow-md hover:opacity-90 transition-all disabled:bg-slate-300 text-sm"
                >
                  {loading ? "Archiving..." : "Verify & Save to Vault"}
                </button>
                <button 
                  onClick={() => {setSoapNote(""); setTranscript(""); setError(null);}}
                  className="flex-1 py-4 border border-sage-border rounded-xl font-bold text-slate-400 hover:bg-slate-50 text-sm"
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}