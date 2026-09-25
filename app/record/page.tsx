'use client'

import { Suspense, useState, useRef } from 'react'
import { createClient as createDeepgramClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/utils/supabase/client'; 

type BillingCode = {
  code: string;
  type: 'ICD-10' | 'CPT';
  description: string;
  confidence: 'high' | 'medium' | 'low';
};

const CONFIDENCE_STYLES: Record<BillingCode['confidence'], string> = {
  high: 'bg-sage-primary/15 text-sage-primary border-sage-primary/30',
  medium: 'bg-sage-primary/5 text-sage-primary/80 border-sage-primary/20',
  low: 'bg-slate-100 text-slate-400 border-slate-200',
};

const formatSoapText = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
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

function RecordContent() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const searchParams = useSearchParams();
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');
  const specialty = searchParams.get('specialty');
  const patientId = searchParams.get('patientId');
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [soapNote, setSoapNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [language, setLanguage] = useState<'en' | 'tr' | 'ar' | 'ka'>('en');
  const [noteLanguage, setNoteLanguage] = useState<'same' | 'en'>('same');

  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);

  const [isEdited, setIsEdited] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signature, setSignature] = useState("");
  
  const socketRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSoapNote(e.target.value);
    if (!isEdited) setIsEdited(true);
  };

  const handleBillingCodeChange = (
    index: number,
    field: 'code' | 'description',
    value: string
  ) => {
    setBillingCodes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    if (!isEdited) setIsEdited(true);
  };

  const handleRemoveBillingCode = (index: number) => {
    setBillingCodes((prev) => prev.filter((_, i) => i !== index));
    if (!isEdited) setIsEdited(true);
  };

  // const generateSOAP = async () => {
  //   setIsGenerating(true);
  //   setError(null);

  //   try {
  //     const response = await fetch('/api/generate-soap', {
  //       method: 'POST',
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ 
  //         transcript,
  //         language: language,
  //         patientName: `${firstName} ${lastName}`,
  //         specialty: specialty
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || "Gemini is busy.");
  //     }

  //     const data = await response.json();
  //     setSoapNote(data.soapNote);
  //   } catch (err: any) {
  //     console.error(err);
  //     setError("Medical AI is under high demand. Please try again.");
  //   } finally {
  //     setIsGenerating(false);
  //   }
  // };
  const generateSOAP = async (transcriptOverride?: string) => {
  const activeTranscript = transcriptOverride ?? transcript;
  setIsGenerating(true);
  setError(null);

  try {
    const response = await fetch('/api/generate-soap', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        transcript: activeTranscript,
        language,
        noteLanguage,
        patientName: `${firstName} ${lastName}`,
        specialty,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Gemini is busy.");
    }

    const data = await response.json();
    setSoapNote(data.soapNote);
    extractBillingCodes(data.soapNote);
  } catch (err: any) {
    console.error(err);
    setError(err.message || "Medical AI is under high demand. Please try again.");
  } finally {
    setIsGenerating(false);
  }
};

  // Billing extraction is best-effort: failures never block the note itself
  const extractBillingCodes = async (note: string) => {
    try {
      const response = await fetch('/api/extract-billing', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soapNote: note, specialty }),
      });

      if (!response.ok) return;

      const data = await response.json();
      setBillingCodes(Array.isArray(data.codes) ? data.codes : []);
    } catch (err) {
      console.error("Billing extraction error:", err);
    }
  };

  const handleConfirmSignOff = async () => {
    const signedName = signature.trim();
    if (!signedName) return;

    setShowSignOffModal(false);
    await handleSave(signedName);
  };

  const handleSave = async (practitionerSignature: string) => {
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
            is_edited: isEdited,
            practitioner_signature: practitionerSignature,
            signed_at: new Date().toISOString(),
            icd10_codes: billingCodes.filter((c) => c.type === 'ICD-10'),
            cpt_codes: billingCodes.filter((c) => c.type === 'CPT'),
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

  // HYBRID START SESSION (WS for en/tr, Chunked REST for ar/ka)
  const audioChunksRef = useRef<Blob[]>([]);

  const startSession = async () => {
    if (!hasConsent) return alert("Patient consent is required.");

    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          if ((language === 'en' || language === 'tr') && socketRef.current) {
            try {
              socketRef.current.send(event.data);
            } catch (e) {
              // ignore silent send drop before open
            }
          }
        }
      };

      if (language === 'en' || language === 'tr') {
        const authRes = await fetch('/api/authenticate');
        const data = await authRes.json();
        const token = data.token || data.key;
        if (!token) throw new Error("Missing Deepgram token");

        const deepgram = createDeepgramClient(token);
        const modelToUse = language === 'en' ? 'nova-2-medical' : 'nova-2';

        const connection = deepgram.listen.live({
          model: modelToUse,
          interim_results: true,
          smart_format: true,
          language: language,
        });

        socketRef.current = connection;

        connection.on(LiveTranscriptionEvents.Open, () => {
          // Start recording chunks only when connection is open and ready
          mediaRecorder.start(250);
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          const received = data.channel.alternatives[0].transcript;
          if (data.is_final && received !== "") {
            setTranscript((prev) => (prev ? prev + " " + received : received));
          }
        });

        connection.on(LiveTranscriptionEvents.Error, (err) => {
          console.error("Deepgram WS Error:", err);
        });
      } else {
        // Arabic / Georgian: collect blob chunks for post-encounter high-accuracy REST parse
        mediaRecorder.start(250);
      }
    } catch (err: any) {
      console.error("Microphone/Session error:", err);
      alert("Microphone access denied or initialization failed.");
      setIsRecording(false);
    }
  };

  // const stopSession = async () => {
  //   setIsRecording(false);
  //   mediaRecorderRef.current?.stop();
    
  //   if (socketRef.current) {
  //     socketRef.current.finish();
  //     socketRef.current = null;
  //   }

  //   if (streamRef.current) {
  //     streamRef.current.getTracks().forEach((track) => track.stop());
  //     streamRef.current = null;
  //   }

  //   let activeTranscript = transcript;

  //   // For Arabic/Georgian, compile complete audio blob and transcribe cleanly on stop
  //   if (language === 'ar' || language === 'ka') {
  //     if (audioChunksRef.current.length > 0) {
  //       setIsGenerating(true);
  //       try {
  //         const completeBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
  //         const formData = new FormData();
  //         formData.append('file', completeBlob, 'audio.webm');
  //         formData.append('language', language);

  //         const res = await fetch('/api/transcribe-chunk', {
  //           method: 'POST',
  //           body: formData,
  //         });
  //         const json = await res.json();
  //         if (json.text) {
  //           setTranscript(json.text.trim());
  //           activeTranscript = json.text.trim();
  //         }
  //       } catch (e) {
  //         console.error("Full audio transcription error:", e);
  //       } finally {
  //         setIsGenerating(false);
  //       }
  //     }
  //   }

  //   if (activeTranscript.trim().length > 3) {
  //     await generateSOAP();
  //   }
  // };
  const stopSession = async () => {
  setIsRecording(false);
  mediaRecorderRef.current?.stop();

  if (socketRef.current) {
    socketRef.current.finish();
    socketRef.current = null;
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Give Deepgram's final transcript event time to land in state
  // before we read it (fixes truncated EN/TR transcripts on stop)
  if (language === 'en' || language === 'tr') {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  let activeTranscript = transcript;

  // For Arabic/Georgian, compile complete audio blob and transcribe cleanly on stop
  if (language === 'ar' || language === 'ka') {
    if (audioChunksRef.current.length > 0) {
      setIsGenerating(true);
      try {
        const completeBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', completeBlob, 'audio.webm');
        formData.append('language', language);

        const res = await fetch('/api/transcribe-chunk', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.text) {
          setTranscript(json.text.trim());
          activeTranscript = json.text.trim();
        }
      } catch (e) {
        console.error("Full audio transcription error:", e);
      } finally {
        setIsGenerating(false);
      }
    }
  }

  if (activeTranscript.trim().length > 3) {
    await generateSOAP(activeTranscript);
  }
};

  //   if (transcript.trim().length > 10 || audioChunksRef.current.length > 0) {
  //     // Small delay to let final transcript state flush if needed
  //     setTimeout(async () => {
  //       await generateSOAP();
  //     }, 500);
  //   }
  // };

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-slate-50/30">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-sage-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Align Scribe</h1>
          {(firstName || lastName) && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold text-slate-600">
                Patient: {firstName} {lastName}
              </span>
              {specialty && (
                <span className="bg-sage-primary/15 text-sage-primary border border-sage-primary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
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

          {!isRecording && (
            <div className="flex flex-wrap justify-center gap-3 mb-2">
              {[
                { id: 'en', label: 'ENGLISH (Live WS)' },
                { id: 'ar', label: 'عربي (High-Acc Chunk)' },
                { id: 'ka', label: 'ქართული (Chunk)' },
                { id: 'tr', label: 'TÜRKÇE (Live WS)' },
              ].map((lang) => (
                <button 
                  key={lang.id}
                  onClick={() => setLanguage(lang.id as 'en' | 'tr' | 'ar' | 'ka')}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    language === lang.id
                      ? 'bg-sage-primary text-white scale-105'
                      : 'bg-white border border-sage-border text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}

          {!isRecording && (
  <div className="flex flex-wrap justify-center items-center gap-3 mb-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note output:</span>
    {[
      { id: 'same', label: 'Same as spoken' },
      { id: 'en', label: 'Always English' },
    ].map((opt) => (
      <button
        key={opt.id}
        onClick={() => setNoteLanguage(opt.id as 'same' | 'en')}
        className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
          noteLanguage === opt.id
            ? 'bg-sage-primary text-white scale-105'
            : 'bg-white border border-sage-border text-slate-400 hover:bg-slate-50'
        }`}
      >
        {opt.label}
      </button>
    ))}
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
          <div className="space-y-3">
            <h3 className="font-bold text-slate-400 uppercase text-[11px] tracking-[0.15em] ml-2">Encounter Transcript</h3>
            <div className="bg-white p-6 rounded-3xl border border-sage-border text-slate-600 h-[650px] overflow-y-auto leading-relaxed text-sm shadow-sm">
              {transcript || "No transcript data available."}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end ml-2">
              <h3 className="font-bold text-sage-primary uppercase text-[11px] tracking-[0.15em]">Structured Clinical Note</h3>
              {isEditMode && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider animate-pulse">● Editing Mode</span>}
            </div>
            
            {error ? (
              <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center space-y-4 h-[650px] flex flex-col justify-center shadow-sm">
                <p className="text-red-800 text-sm font-medium">{error}</p>
                <button onClick={() => generateSOAP()} className="bg-sage-primary text-white px-6 py-3 rounded-xl font-bold text-sm self-center hover:opacity-90 transition-all shadow-md">
                  Retry AI Generation
                </button>
              </div>
            ) : (
              <div className={`flex flex-col h-[650px] rounded-3xl overflow-hidden transition-all duration-300 shadow-sm ${isEditMode ? 'ring-2 ring-amber-300 border-transparent shadow-md' : 'border border-sage-border bg-white'}`}>
                
                <div className={`px-6 py-3 border-b flex justify-between items-center ${isEditMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-sage-border'}`}>
                  <span className="text-xs font-bold text-slate-500">
                    {specialty ? `${specialty} Department` : 'General Practice'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>

                {isEditMode ? (
                  <textarea 
                    value={soapNote}
                    onChange={handleTextChange}
                    className="flex-1 w-full p-6 text-sm font-sans leading-relaxed resize-none outline-none transition-colors bg-white text-slate-800"
                    placeholder="AI structured output will appear here..."
                  />
                ) : (
                  <div className="flex-1 w-full p-6 text-sm font-sans leading-relaxed overflow-y-auto transition-colors bg-slate-50/50 text-slate-700">
                    {soapNote ? formatSoapText(soapNote) : <span className="text-slate-400 italic">AI structured output will appear here...</span>}
                  </div>
                )}
              </div>
            )}

            {!error && billingCodes.length > 0 && (
              <div className={`rounded-3xl p-5 mt-4 shadow-sm transition-all duration-300 ${isEditMode ? 'bg-amber-50/40 ring-2 ring-amber-300' : 'bg-white border border-sage-border'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-400 uppercase text-[11px] tracking-[0.15em]">
                    Suggested Billing Codes
                  </h3>
                  {isEditMode && (
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider animate-pulse">● Editing Mode</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {billingCodes.map((item, i) => (
                    <span
                      key={i}
                      title={`${item.type} · ${item.confidence} confidence`}
                      className={`flex items-center px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-sm ${
                        isEditMode
                          ? 'bg-white border-amber-200 text-slate-700'
                          : CONFIDENCE_STYLES[item.confidence]
                      }`}
                    >
                      {isEditMode ? (
                        <>
                          <input
                            value={item.code}
                            onChange={(e) => handleBillingCodeChange(i, 'code', e.target.value)}
                            size={Math.max(item.code.length, 4)}
                            aria-label={`${item.type} code`}
                            className="bg-transparent outline-none font-bold text-slate-800"
                          />
                          <input
                            value={item.description}
                            onChange={(e) => handleBillingCodeChange(i, 'description', e.target.value)}
                            size={Math.max(item.description.length, 12)}
                            placeholder="Description"
                            aria-label={`${item.code} description`}
                            className="ml-2 bg-transparent outline-none font-medium text-slate-600"
                          />
                          <button
                            onClick={() => handleRemoveBillingCode(i)}
                            aria-label={`Remove ${item.code}`}
                            className="ml-2 text-amber-500 hover:text-red-500 transition-colors leading-none"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <>
                          {item.code}
                          {item.description && (
                            <span className="ml-2 font-medium opacity-80">{item.description}</span>
                          )}
                        </>
                      )}
                    </span>
                  ))}
                </div>
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
                    onClick={() => setShowSignOffModal(true)}
                    disabled={loading}
                    className="flex-[2] bg-sage-primary text-white py-4 rounded-2xl font-bold shadow-md hover:bg-sage-dark transition-all disabled:bg-slate-300 text-sm transform active:scale-[0.98]"
                  >
                    {loading ? "Archiving to Vault..." : "Verify & Save to Vault"}
                  </button>
                </div>

                <button 
                  onClick={() => {setSoapNote(""); setTranscript(""); setError(null); setIsEdited(false); setIsEditMode(false); setBillingCodes([]);}}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-all text-xs uppercase tracking-wider"
                >
                  Discard Encounter
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showSignOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-3xl border border-sage-border shadow-xl p-8 space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Clinical Sign-Off</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Required before archiving to the vault</p>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-sage-primary/5 border border-sage-primary/20 rounded-2xl p-4">
              I attest that I have reviewed and verified this AI-generated clinical note.
            </p>

            <div className="space-y-2">
              <label htmlFor="signature" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Type your full name to sign
              </label>
              <input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Dr. Jane Doe"
                autoFocus
                className="w-full px-4 py-3 bg-white border border-sage-border rounded-2xl text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sage-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSignOffModal(false)}
                className="flex-1 bg-white border border-sage-border text-slate-500 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOff}
                disabled={!signature.trim() || loading}
                className="flex-[2] bg-sage-primary text-white py-3.5 rounded-2xl font-bold shadow-md hover:bg-sage-dark transition-all disabled:bg-slate-300 disabled:shadow-none text-sm transform active:scale-[0.98]"
              >
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading session...</div>}>
      <RecordContent />
    </Suspense>
  )
}