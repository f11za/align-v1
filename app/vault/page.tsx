'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getFormattedId } from '@/utils/patient'

export default function PatientVault() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('') // --- NEW SEARCH STATE ---
  const supabase = createClient()

  // --- PRINT FUNCTION ---
  const handlePrint = (note: any) => {
    const printWindow = window.open('', '_blank');
    
    const fName = note.patients?.first_name || '';
    const lName = note.patients?.last_name || '';
    const patientFullName = `${fName} ${lName}`.trim();
    
    const patientId = getFormattedId(patientFullName, note.patient_id || note.id);

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Clinical Note - ${patientId}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
              h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { color: #64748b; font-size: 12px; margin-bottom: 30px; font-family: monospace; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Clinical SOAP Note</h1>
            <div class="meta">Date: ${new Date(note.created_at).toLocaleString()} | Patient ID: ${patientId}</div>
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
          .select('*, patients(first_name, last_name)') 
          .eq('practitioner_id', user.id)
          .order('created_at', { ascending: false })
          
        setNotes(data || [])
      }
      setLoading(false)
    }
    fetchVault()
  }, [])

  // --- FILTERING LOGIC ---
  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true; // If no search, show all
    
    const fName = note.patients?.first_name || '';
    const lName = note.patients?.last_name || '';
    const patientFullName = `${fName} ${lName}`.trim();
    
    const identifier = getFormattedId(patientFullName, note.patient_id || note.id);
    
    // Normalize the search query to handle spaces (e.g. "John Doe" -> "john_doe")
    const normalizedSearch = searchQuery.trim().replace(/\s+/g, '_').toLowerCase();
    
    return identifier.includes(normalizedSearch);
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Vault</h1>
          <p className="text-slate-500 mt-1">Encrypted clinical archive of all recorded encounters.</p>
        </div>

        {/* --- SEARCH BAR UI --- */}
        <div className="w-full md:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search identifier (e.g. john_doe)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-primary focus:border-transparent transition-all text-slate-700 shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-sage-border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-sage-border">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Encounter Date</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Identifier</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-sage-border">
            {/* --- MAP OVER FILTERED NOTES INSTEAD OF NOTES --- */}
            {filteredNotes.map((note) => {
              const fName = note.patients?.first_name || '';
              const lName = note.patients?.last_name || '';
              const patientFullName = `${fName} ${lName}`.trim();

              return (
                <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 text-slate-600 font-medium">
                    {new Date(note.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  
                  <td className="px-8 py-6 text-slate-900 font-bold font-mono text-sm">
                    {getFormattedId(patientFullName, note.patient_id || note.id)}
                    {note.is_edited && (
                      <span className="ml-3 text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest font-sans">
                        Edited
                      </span>
                    )}
                  </td>

                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handlePrint(note)}
                      className="text-sage-primary font-bold hover:text-sage-dark transition-colors text-sm bg-sage-light/20 px-4 py-2 rounded-lg"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* --- EMPTY STATES --- */}
        {!loading && notes.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Your vault is currently empty.</p>
            <p className="text-sm text-slate-400 mt-1">Record a session to see it archived here.</p>
          </div>
        )}

        {!loading && notes.length > 0 && filteredNotes.length === 0 && (
          <div className="p-16 text-center text-slate-500 font-medium">
            No patients found matching "<span className="text-slate-800">{searchQuery}</span>".
          </div>
        )}
      </div>
    </div>
  )
}