'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export function UserProfile() {
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mt-auto p-4 border-t border-sage-border bg-slate-50/50 rounded-b-3xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-sage-primary flex items-center justify-center text-white font-bold text-xs">
            {userEmail?.[0].toUpperCase() || "P"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practitioner</p>
            <p className="text-xs font-bold text-slate-700 truncate">{userEmail}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full mt-2 text-left px-2 py-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
        >
          Sign Out of Session
        </button>
      </div>
    </div>
  )
}