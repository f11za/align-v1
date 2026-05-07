'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PatientVault() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
                <td className="px-8 py-6 text-slate-900 font-bold">{note.patient_name || "New Encounter"}</td>
                <td className="px-8 py-6 text-right">
                  <button className="text-sage-primary font-bold hover:underline">Download PDF</button>
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