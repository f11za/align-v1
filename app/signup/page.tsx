'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client' 
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          specialty,
          facility_name: facilityName,
        },
      },
    })

    if (authError) {
      alert(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('practitioners')
        .insert([
          { 
            id: data.user.id,
            full_name: fullName,
            email,
            specialty,
            facility_name: facilityName,
          }
        ])

      if (profileError) {
        console.error("Database profile error:", profileError.message)
      }
    }

    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-sage-primary px-6 py-10">
      <div className="absolute -top-28 -left-28 h-80 w-80 animate-blob rounded-full bg-white/20 blur-3xl" />
      <div className="absolute top-1/4 -right-32 h-96 w-96 animate-blob animation-delay-2000 rounded-full bg-sage-light/30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 animate-blob animation-delay-4000 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-3xl border border-sage-border shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-sage-primary">Join Align</h1>
          <p className="text-slate-500 mt-2 font-medium">Create your practitioner account</p>
        </header>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
            <input
              type="text"
              placeholder="Dr. Jane Smith"
              className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl text-slate-900 focus:ring-2 focus:ring-sage-primary focus:border-transparent outline-none transition-all"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Specialty</label>
            <input
              type="text"
              placeholder="General Practice"
              className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl text-slate-900 focus:ring-2 focus:ring-sage-primary focus:border-transparent outline-none transition-all"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Facility Name</label>
            <input
              type="text"
              placeholder="Align Medical Center"
              className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl text-slate-900 focus:ring-2 focus:ring-sage-primary focus:border-transparent outline-none transition-all"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Work Email</label>
            <input
              type="email"
              placeholder="fiza@clinic.ae"
              className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl text-slate-900 focus:ring-2 focus:ring-sage-primary focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Secure Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl text-slate-900 focus:ring-2 focus:ring-sage-primary focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-sage-primary text-white py-4 rounded-xl font-bold hover:opacity-90 disabled:bg-slate-300 shadow-md transition-all mt-4"
          >
            {loading ? 'Setting up Vault...' : 'Initialize Account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already a member?{' '}
            <Link href="/login" className="font-bold text-sage-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}