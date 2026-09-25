'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { BillingCode, CONFIDENCE_STYLES, formatSoapText } from '@/utils/soap'

export default function EncounterDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [note, setNote] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNote() {
      const { data } = await supabase
        .from('soap_notes')
        .select('*, patients(first_name, last_name, date_of_birth)')
        .eq('id', id)
        .maybeSingle()

      setNote(data)
      setLoading(false)
    }
    fetchNote()
  }, [id])

  if (loading) {
    return <div className="max-w-3xl mx-auto p-8 text-center text-slate-400 font-medium">Loading encounter...</div>
  }

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto p-20 text-center space-y-3">
        <p className="font-bold text-slate-700">Encounter not found</p>
        <Link href="/dashboard" className="text-sage-primary font-bold text-sm hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const fName = note.patients?.first_name || ''
  const lName = note.patients?.last_name || ''
  const patientName = `${fName} ${lName}`.trim()
  const billingCodes: BillingCode[] = [
    ...(Array.isArray(note.icd10_codes) ? note.icd10_codes : []),
    ...(Array.isArray(note.cpt_codes) ? note.cpt_codes : []),
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href="/dashboard" className="inline-block text-slate-400 hover:text-sage-primary text-xs font-bold uppercase tracking-wider transition-colors">
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {patientName || 'Unknown patient'}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
          {note.patients?.date_of_birth && (
            <span>
              DOB: {new Date(note.patients.date_of_birth).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {new Date(note.created_at).toLocaleDateString()}
          </span>
          {note.is_edited && (
            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
              Edited
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-3xl overflow-hidden border border-sage-border bg-white shadow-sm">
        <div className="px-6 py-3 border-b border-sage-border bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">Structured Clinical Note</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(note.created_at).toLocaleString()}
          </span>
        </div>
        <div className="w-full p-6 text-sm font-sans leading-relaxed bg-slate-50/50 text-slate-700">
          {note.raw_ai_output
            ? formatSoapText(note.raw_ai_output)
            : <span className="text-slate-400 italic">No note content available.</span>}
        </div>
      </div>

      {billingCodes.length > 0 && (
        <div className="bg-white border border-sage-border rounded-3xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-400 uppercase text-[11px] tracking-[0.15em] mb-3">
            Billing Codes
          </h3>
          <div className="flex flex-wrap gap-2">
            {billingCodes.map((item, i) => (
              <span
                key={`${item.code}-${i}`}
                title={`${item.type} · ${item.confidence} confidence`}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-sm ${CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.low}`}
              >
                {item.code}
                {item.description && (
                  <span className="ml-2 font-medium opacity-80">{item.description}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {note.practitioner_signature && (
        <div className="bg-white border border-sage-border rounded-3xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-400 uppercase text-[11px] tracking-[0.15em] mb-3">
            Clinical Sign-Off
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-sage-primary/5 border border-sage-primary/20 rounded-2xl p-4">
            I attest that I have reviewed and verified this AI-generated clinical note.
          </p>
          <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
            <span className="text-sm font-bold text-slate-800">{note.practitioner_signature}</span>
            {note.signed_at && (
              <span className="text-[10px] text-slate-400 font-mono">
                Signed {new Date(note.signed_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
