'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    router.replace('/dashboard')
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand light"><div className="brand-mark inverse">R</div><div><strong>RehabTrack</strong><span>Smart rehabilitation monitoring</span></div></div>
        <div className="hero-copy">
          <span className="pill white">ESP32 + Flex Sensor + MPU6050</span>
          <h1>Track every movement.<br />Count every rep.</h1>
          <p>Monitor back and lower limb exercises in real time, review daily progress, and keep every rehabilitation session in one place.</p>
          <div className="signal-card"><span className="pulse-dot" /><div><strong>IRL / Real-time Tracking</strong><small>Live movement data from your ESP32 device</small></div></div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow orange">PATIENT LOGIN</span>
          <h2>Welcome back</h2>
          <p>Sign in to view your exercise data and history.</p>
          <label>Email<input type="email" placeholder="patient@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary-btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="auth-switch">New patient? <Link href="/register">Create an account</Link></p>
        </form>
      </section>
    </main>
  )
}
