'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const SPECIALTIES = [
  'Internal Medicine',
  'Surgery',
  'Emergency',
  'Oncology',
]

export default function IntakePage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    specialty: 'Internal Medicine',
  })

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleStartEncounter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('User not authenticated')
      return
    }

    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .insert({
        practitioner_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
      })
      .select('id')
      .single()

    if (patientError) {
      console.error('Error creating patient:', patientError)
      return
    }

    if (patientData) {
      router.push(
        `/record?patientId=${patientData.id}&firstName=${encodeURIComponent(
          formData.firstName
        )}&lastName=${encodeURIComponent(
          formData.lastName
        )}&dob=${encodeURIComponent(
          formData.dateOfBirth
        )}&specialty=${encodeURIComponent(formData.specialty)}`
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          {/* Centered Plus Icon Box */}
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-primary/10">
            <svg
              className="h-7 w-7 text-sage-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
            Patient Intake
          </h1>

          <p className="mt-2 text-slate-600">
            Enter patient details to begin the consultation recording and
            documentation process.
          </p>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          {/* Card Top Accent */}
          <div className="h-2 w-full rounded-t-3xl bg-sage-primary" />

          <form onSubmit={handleStartEncounter}>
            <div className="p-8 md:p-10">
              <div className="space-y-6">
                {/* First Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    placeholder="Enter first name"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 hover:bg-white focus:border-sage-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-sage-primary/15"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    placeholder="Enter last name"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 hover:bg-white focus:border-sage-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-sage-primary/15"
                    required
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dateOfBirth: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 hover:bg-white focus:border-sage-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-sage-primary/15"
                    required
                  />
                </div>

                {/* Specialty Dropdown */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Specialty
                  </label>

                  <div className="relative" ref={dropdownRef}>
                    {/* Selected Item Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`flex w-full items-center justify-between rounded-2xl border bg-slate-50 px-4 py-4 text-left transition-all duration-200 hover:border-slate-400 hover:bg-white focus:outline-none ${
                        isDropdownOpen
                          ? 'border-sage-primary bg-white ring-4 ring-sage-primary/15'
                          : 'border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-primary/10">
                          <svg
                            className="h-4 w-4 text-sage-primary"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-900">
                          {formData.specialty}
                        </span>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        <svg
                          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Custom Animated Scrollable Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/80 scrollbar-thin scrollbar-thumb-slate-200">
                        {SPECIALTIES.map((option) => {
                          const isSelected = formData.specialty === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, specialty: option })
                                setIsDropdownOpen(false)
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'bg-sage-primary/10 text-sage-primary'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span>{option}</span>
                              {isSelected && (
                                <svg
                                  className="h-4 w-4 text-sage-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                  />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sage-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sage-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sage-primary/30 active:translate-y-0"
                >
                  Start Encounter
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer helper text */}
        <p className="mt-4 text-center text-sm text-slate-500">
          Consultation recordings are securely processed and documented.
        </p>
      </div>
    </div>
  )
}