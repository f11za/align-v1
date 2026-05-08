'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PatientVault() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // 1. Add this print function inside your component
  const handlePrint = (note: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Clinical Note - ${new Date(note.created_at).toLocaleDateString()}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
              h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { color: #64748b; font-size: 12px; margin-bottom: 30px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Clinical SOAP Note</h1>
            <div class="meta">Date: ${new Date(note.created_at).toLocaleString()} | Session ID: ${note.id.substring(0,8)}</div>
            <div class="content">${note.raw_ai_output?.replace(/[#*]/g, '')}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  useEffect(() => {
    async function fetchVault() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('soap_notes')
          .select('*')
          .eq('practitioner_id', user.id) // Security: Only fetch own notes
          .order('created_at', { ascending: false })
        setNotes(data || [])
      }
      setLoading(false)
    }
    fetchVault()
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Vault</h1>
          <p className="text-slate-500 mt-1">Encrypted clinical archive of all recorded encounters.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-sage-border shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-sage-light/30 border-b border-sage-border">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Encounter Date</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Identifier</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-sage-border">
            {notes.map((note) => (
              <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 text-slate-600 font-medium">
                  {new Date(note.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </td>
                
                {/* IMPROVED IDENTIFIER */}
                <td className="px-8 py-6 text-slate-900 font-bold">
                  {note.patient_name || `Ref: ${note.id.substring(0, 8).toUpperCase()}`}
                  {note.is_edited && (
                    <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      Edited
                    </span>
                  )}
                </td>

                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => handlePrint(note)} // TRIGGER THE HACK
                    className="text-sage-primary font-bold hover:underline"
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && notes.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-medium">
            Your vault is currently empty. Record a session to see it here.
          </div>
        )}
      </div>
    </div>
  )
}