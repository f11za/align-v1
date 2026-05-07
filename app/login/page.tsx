'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-sage-primary px-6 py-10">
      <div className="absolute -top-28 -left-28 h-80 w-80 animate-blob rounded-full bg-white/20 blur-3xl" />
      <div className="absolute top-1/4 -right-32 h-96 w-96 animate-blob animation-delay-2000 rounded-full bg-sage-light/30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 animate-blob animation-delay-4000 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-3xl border border-sage-border shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-sage-primary">Align</h1>
          <p className="text-slate-500 mt-2 font-medium">Welcome back, Practitioner</p>
        </header>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Work Email"
            className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl outline-none focus:ring-2 focus:ring-sage-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 bg-slate-50 border border-sage-border rounded-xl outline-none focus:ring-2 focus:ring-sage-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button disabled={loading} className="w-full bg-sage-primary text-white py-4 rounded-xl font-bold hover:opacity-90 shadow-md transition-all">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to the platform?{' '}
          <Link href="/signup" className="text-sage-primary font-bold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}