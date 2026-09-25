// 'use client'

// import { useEffect, useState } from 'react'
// import { createClient } from '@/utils/supabase/client'
// import { useRouter } from 'next/navigation'

// export default function Dashboard() {
//   const [encounters, setEncounters] = useState<any[]>([])
//   const router = useRouter()
//   const supabase = createClient()

//   useEffect(() => {
//     const fetchDashboardData = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) return

//       const { data, error } = await supabase
//         .from('soap_notes')
//         .select('id, created_at, raw_ai_output')
//         .eq('practitioner_id', user.id)
//         .order('created_at', { ascending: false })
//         .limit(5)

//       if (error) {
//         console.error('Dashboard fetch error:', error.message)
//         return
//       }

//       if (data) setEncounters(data)
//     }

//     fetchDashboardData()
//   }, [supabase])

//   return (
//     <div className="max-w-5xl mx-auto">
//       <header className="flex justify-between items-center mb-10">
//         <div>
//           <h1 className="text-3xl font-bold text-slate-900">
//             Clinical Dashboard
//           </h1>
//           <p className="text-slate-500">
//             Welcome back. You have {encounters.length} recent scribe sessions.
//           </p>
//         </div>

//         <button
//           onClick={() => router.push('/intake')}
//           className="bg-sage-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
//         >
//           + New Encounter
//         </button>
//       </header>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
//         {[
//           { label: 'Total Encounters', value: encounters.length },
//           {
//             label: 'Clinical Minutes Saved',
//             value: encounters.length * 15,
//           }, // Assume 15 mins saved per note
//           { label: 'Verified for Vault', value: encounters.length },
//         ].map((stat) => (
//           <div
//             key={stat.label}
//             className="bg-white p-6 rounded-2xl border border-sage-border shadow-sm"
//           >
//             <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
//               {stat.label}
//             </p>
//             <p className="text-4xl font-bold text-sage-primary mt-2">
//               {stat.value}
//             </p>
//           </div>
//         ))}
//       </div>

//       <div className="bg-white rounded-2xl border border-sage-border shadow-sm overflow-hidden">
//         <div className="p-6 border-b border-sage-border bg-slate-50/50">
//           <h3 className="font-bold text-slate-800">
//             Recent Scribe Sessions
//           </h3>
//         </div>

//         <div className="divide-y divide-sage-border">
//           {encounters.length > 0 ? (
//             encounters.map((note, index) => (
//               <div
//                 key={note.id}
//                 className="p-6 hover:bg-slate-50 transition-colors"
//               >
//                 <div className="flex justify-between mb-2">
//                   <h3 className="font-bold text-slate-800">
//                     Encounter #{encounters.length - index}
//                   </h3>
//                   <span className="text-[10px] text-slate-400 font-bold uppercase">
//                     {new Date(note.created_at).toLocaleDateString()}
//                   </span>
//                 </div>

//                 <p className="text-sm text-slate-500 line-clamp-2 italic">
//                   {note.raw_ai_output
//                     ?.replace(/[#*]/g, '')
//                     .substring(0, 150) ||
//                     'No SOAP note preview available'}
//                   ...
//                 </p>
//               </div>
//             ))
//           ) : (
//             <div className="p-6 text-center">
//               <p className="font-bold text-slate-700">No encounters yet</p>
//               <p className="text-sm text-slate-500 mt-1">
//                 Start a scribe session to see recent SOAP notes here.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getFormattedId } from '@/utils/patient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [encounters, setEncounters] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get the true total count (no limit) — head: true means no rows
      // are actually returned, just the count, so this is cheap
      const { count, error: countError } = await supabase
        .from('soap_notes')
        .select('id', { count: 'exact', head: true })
        .eq('practitioner_id', user.id)

      if (countError) {
        console.error('Count fetch error:', countError.message)
      } else {
        setTotalCount(count ?? 0)
      }

      // Recent 5, for the list display only
      const { data, error } = await supabase
        .from('soap_notes')
        .select('*, patients(first_name, last_name)')
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Dashboard fetch error:', error.message)
        return
      }

      if (data) setEncounters(data)
    }

    fetchDashboardData()
  }, [supabase])

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Clinical Dashboard
          </h1>
          <p className="text-slate-500">
            Welcome back. You have {encounters.length} recent scribe sessions.
          </p>
        </div>

        <button
          onClick={() => router.push('/intake')}
          className="bg-sage-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
        >
          + New Encounter
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Encounters', value: totalCount },
          {
            label: 'Clinical Minutes Saved',
            value: totalCount * 15,
          }, // Assume 15 mins saved per note
          { label: 'Verified for Vault', value: totalCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-2xl border border-sage-border shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-4xl font-bold text-sage-primary mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-sage-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-sage-border bg-slate-50/50">
          <h3 className="font-bold text-slate-800">
            Recent Scribe Sessions
          </h3>
        </div>

        <div className="divide-y divide-sage-border">
          {encounters.length > 0 ? (
            encounters.map((note) => (
              <Link
                key={note.id}
                href={`/vault/${note.id}`}
                className="block p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-slate-800 font-mono text-sm">
                    {getFormattedId(
                      `${note.patients?.first_name || ''} ${
                        note.patients?.last_name || ''
                      }`.trim(),
                      note.patient_id || note.id
                    )}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 italic">
                  {note.raw_ai_output
                    ?.replace(/[#*]/g, '')
                    .substring(0, 150) ||
                    'No SOAP note preview available'}
                  ...
                </p>
              </Link>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="font-bold text-slate-700">No encounters yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Start a scribe session to see recent SOAP notes here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}