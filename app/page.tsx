'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checkingUser, setCheckingUser] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.push('/dashboard')
      } else {
        setCheckingUser(false)
      }
    }

    checkUser()
  }, [router, supabase])

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sage-primary">
        <div className="animate-pulse text-white font-serif italic text-xl">
          Initializing Align...
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-sage-primary text-white">
      <div className="absolute -top-28 -left-28 h-80 w-80 animate-blob rounded-full bg-white/20 blur-3xl" />
      <div className="absolute top-1/4 -right-32 h-96 w-96 animate-blob animation-delay-2000 rounded-full bg-sage-light/30 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 animate-blob animation-delay-4000 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Align</h1>
            <div className="mt-1 h-1 w-8 rounded-full bg-white/80" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-sage-primary shadow-sm transition hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-2">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur">
              Privacy-first clinical intelligence
            </div>

            <h2 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
              Transform clinical conversations into structured SOAP notes.
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-white/75">
              Align listens to ambient doctor-patient encounters and converts them into clean,
              structured medical documentation in real time — so clinicians can focus on care,
              not typing.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-2xl bg-white px-8 py-4 text-center font-bold text-sage-primary shadow-lg transition hover:opacity-90"
              >
                Create Account
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-center font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Practitioner Login
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/95 p-6 text-slate-800 shadow-2xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between border-b border-sage-border pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Live Encounter
                </p>
                <h3 className="mt-1 text-xl font-bold text-sage-primary">
                  SOAP Note Preview
                </h3>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 border border-sage-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Subjective
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Patient reports sore throat, dry cough, fatigue, and mild fever for three days.
                  Denies chest pain or shortness of breath.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-sage-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Objective
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Mild fever reported. Patient appears stable and able to tolerate fluids.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-sage-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Assessment
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Symptoms consistent with likely viral upper respiratory infection.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-sage-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Plan
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Continue fluids, rest, and paracetamol as needed. Return if symptoms worsen or
                  breathing difficulty develops.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-10 md:grid-cols-3">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <h3 className="font-bold">Ambient Scribing</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Capture natural clinical dialogue without interrupting the encounter.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <h3 className="font-bold">Structured SOAP Notes</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Convert conversations into organized documentation ready for review.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <h3 className="font-bold">Privacy First</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Designed around consent, clinical security, and responsible medical data handling.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}