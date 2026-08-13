'use client'

import { FormEvent, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { usePatient } from '@/hooks/usePatient'
import { createClient } from '@/lib/supabase/client'

export default function DevicePage() {
  const { user, profile, device, setDevice, loading } = usePatient()
  const [code, setCode] = useState('REHAB-ESP32-001')
  const [name, setName] = useState('My Rehab Sensor')
  const [dailyTarget, setDailyTarget] = useState(profile?.daily_target || 20)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile?.daily_target) setDailyTarget(profile.daily_target)
  }, [profile?.daily_target])

  const pair = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const supabase = createClient()
    const { data, error } = await supabase.from('devices').insert({ patient_id: user.id, device_code: code.trim(), device_name: name.trim() }).select('*').single()
    if (error) return setMessage(error.message)
    setDevice(data)
    setMessage('Device paired successfully. Use the same DEVICE_CODE in the ESP32 sketch.')
  }

  const saveTarget = async () => {
    if (!user) return
    const { error } = await createClient().from('profiles').update({ daily_target: dailyTarget }).eq('id', user.id)
    setMessage(error ? error.message : 'Daily target updated.')
  }

  if (loading) return <main className="center-screen"><div className="loader" /></main>

  return (
    <AppShell name={profile?.full_name} deviceConnected={!!device}>
      <div className="page-title"><div><span className="eyebrow orange">HARDWARE SETUP</span><h1>ESP32 Device</h1><p>Pair one sensor device to your patient account and configure your daily repetition goal.</p></div></div>
      <section className="settings-grid">
        <article className="panel">
          <div className="panel-head"><div><h3>Device connection</h3><p className="muted">Flex Sensor + MPU6050 → ESP32 → Website</p></div></div>
          {device ? <div className="paired-card"><div className="device-illustration">⌁</div><div><span className="live-badge"><span className="dot" /> Paired</span><h3>{device.device_name}</h3><p>{device.device_code}</p></div></div> : (
            <form onSubmit={pair} className="stack-form"><label>Device name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><label>Device code<input value={code} onChange={(e) => setCode(e.target.value)} required /></label><button className="primary-btn">Pair Device</button></form>
          )}
        </article>
        <article className="panel">
          <div className="panel-head"><div><h3>Daily exercise target</h3><p className="muted">Example: 20 repetitions every day.</p></div></div>
          <div className="target-editor"><input type="number" min="1" max="500" value={dailyTarget} onChange={(e) => setDailyTarget(Number(e.target.value))} /><span>reps / day</span></div>
          <button className="primary-btn" onClick={saveTarget}>Save Target</button>
          {message && <div className="alert success top-gap">{message}</div>}
        </article>
      </section>
    </AppShell>
  )
}
