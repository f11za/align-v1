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
    <div className="mt-auto rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sage-primary font-bold text-sm shrink-0">
            {userEmail?.[0].toUpperCase() || "P"}
          </div>

          <div className="flex min-w-0 flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Practitioner
            </p>

            <p className="truncate text-sm font-semibold text-white">
              {userEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-bold text-white/75 transition hover:bg-white/20 hover:text-white"
        >
          Sign Out of Session
        </button>
      </div>
    </div>
  )
}