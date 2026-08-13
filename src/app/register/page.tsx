'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (data.session) router.replace('/dashboard')
    else setMessage('Account created. Check your email if email confirmation is enabled in Supabase.')
  }

  return (
    <main className="auth-page">
      <section className="auth-hero compact">
        <div className="brand light"><div className="brand-mark inverse">R</div><div><strong>RehabTrack</strong><span>Patient Exercise Portal</span></div></div>
        <div className="hero-copy"><span className="pill white">YOUR DATA, YOUR PROGRESS</span><h1>Build a consistent rehabilitation routine.</h1><p>Your repetitions, movement readings and session history stay linked to your own patient account.</p></div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow orange">CREATE PATIENT ACCOUNT</span>
          <h2>Get started</h2>
          <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Patient name" required /></label>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@email.com" required /></label>
          <label>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required /></label>
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <button className="primary-btn" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
          <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  )
}
