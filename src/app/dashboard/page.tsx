'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import LiveChart from '@/components/LiveChart'
import StatCard from '@/components/StatCard'
import { usePatient } from '@/hooks/usePatient'
import { createClient } from '@/lib/supabase/client'
import type { ExerciseSession, SensorReading } from '@/lib/types'

const EXERCISES = ['Back Flexion', 'Back Extension', 'Knee Flexion', 'Leg Raise', 'Ankle Mobility']

export default function DashboardPage() {
  const { user, profile, device, loading } = usePatient()
  const [activeSession, setActiveSession] = useState<ExerciseSession | null>(null)
  const [latest, setLatest] = useState<SensorReading | null>(null)
  const [angles, setAngles] = useState<number[]>([])
  const [todayReps, setTodayReps] = useState(0)
  const [exercise, setExercise] = useState(EXERCISES[0])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const target = profile?.daily_target || 20
  const dailyPercent = Math.min(100, Math.round((todayReps / Math.max(target, 1)) * 100))

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const load = async () => {
      const [{ data: sessions }, { data: active }] = await Promise.all([
        supabase.from('exercise_sessions').select('reps').eq('patient_id', user.id).gte('started_at', start.toISOString()),
        supabase.from('exercise_sessions').select('*').eq('patient_id', user.id).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const sessionRows = (sessions || []) as Array<{ reps: number | null }>
      setTodayReps(sessionRows.reduce((sum, row) => sum + (row.reps || 0), 0))
      setActiveSession(active as ExerciseSession | null)
    }
    load()

    const readingsChannel = supabase
      .channel(`readings-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `patient_id=eq.${user.id}` }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new as SensorReading
        setLatest(row)
        setAngles((prev) => [...prev.slice(-39), row.motion_angle])
      })
      .subscribe()

    const sessionChannel = supabase
      .channel(`sessions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_sessions', filter: `patient_id=eq.${user.id}` }, async () => {
        const { data: active } = await supabase.from('exercise_sessions').select('*').eq('patient_id', user.id).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle()
        setActiveSession(active as ExerciseSession | null)
        const { data: today } = await supabase.from('exercise_sessions').select('reps').eq('patient_id', user.id).gte('started_at', start.toISOString())
        const todayRows = (today || []) as Array<{ reps: number | null }>
        setTodayReps(todayRows.reduce((sum, row) => sum + (row.reps || 0), 0))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(readingsChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [user])

  const sensorState = useMemo(() => {
    if (!latest) return 'Waiting for sensor data'
    const age = Date.now() - new Date(latest.created_at).getTime()
    return age < 10000 ? 'Live now' : 'Last signal received'
  }, [latest])

  const startExercise = async () => {
    if (!user || !device) return setNotice('Pair an ESP32 device first from the Device page.')
    if (activeSession) return
    setBusy(true)
    setNotice('')
    const supabase = createClient()
    const { data, error } = await supabase.from('exercise_sessions').insert({ patient_id: user.id, exercise_name: exercise, target_reps: target }).select('*').single()
    if (error || !data) {
      setBusy(false)
      return setNotice(error?.message || 'Could not start session.')
    }
    await supabase.from('devices').update({ active_session_id: data.id }).eq('id', device.id)
    setActiveSession(data as ExerciseSession)
    setBusy(false)
  }

  const stopExercise = async () => {
    if (!activeSession || !device) return
    setBusy(true)
    const supabase = createClient()
    const { data: rows } = await supabase.from('sensor_readings').select('flex_value,motion_angle,quality_score').eq('session_id', activeSession.id)
    const readings = (rows || []) as Array<Pick<SensorReading, 'flex_value' | 'motion_angle' | 'quality_score'>>
    const avg = (key: 'flex_value' | 'motion_angle' | 'quality_score') => readings.length ? readings.reduce((s, r) => s + Number(r[key] || 0), 0) / readings.length : 0
    const completion = Math.min(100, (activeSession.reps / Math.max(activeSession.target_reps, 1)) * 100)
    const score = Math.round(completion * 0.6 + avg('quality_score') * 0.4)

    await supabase.from('exercise_sessions').update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      avg_flex: Number(avg('flex_value').toFixed(2)),
      avg_motion_angle: Number(avg('motion_angle').toFixed(2)),
      performance_score: score,
    }).eq('id', activeSession.id)
    await supabase.from('devices').update({ active_session_id: null }).eq('id', device.id)
    setActiveSession(null)
    setBusy(false)
  }

  if (loading) return <main className="center-screen"><div className="loader" /><p>Loading patient data...</p></main>

  return (
    <AppShell name={profile?.full_name} deviceConnected={!!device}>
      <section className="welcome-banner">
        <div><span className="pill">TODAY&apos;S GOAL</span><h1>Keep your movement consistent.</h1><p>Complete {target} repetitions today. Every detected rep is saved automatically.</p></div>
        <div className="goal-ring" style={{ '--progress': `${dailyPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{dailyPercent}%</strong><span>{todayReps}/{target} reps</span></div></div>
      </section>

      <section className="stats-grid">
        <StatCard icon="↻" label="Today's Reps" value={todayReps} hint={`Target ${target}`} />
        <StatCard icon="∠" label="Movement Angle" value={`${latest?.motion_angle?.toFixed(1) ?? '0.0'}°`} hint={sensorState} />
        <StatCard icon="⌇" label="Flex Reading" value={latest?.flex_value ?? 0} hint={`Bend ${latest?.bend_angle?.toFixed(1) ?? '0.0'}°`} />
        <StatCard icon="★" label="Movement Quality" value={`${latest?.quality_score ?? 0}%`} hint="Basic sensor analysis" />
      </section>

      <section className="dashboard-grid">
        <article className="panel live-panel">
          <div className="panel-head"><div><span className="eyebrow orange">LIVE TRACKING</span><h3>Movement Angle</h3></div><span className={latest ? 'live-badge' : 'muted-badge'}><span className="dot" /> {latest ? 'Receiving data' : 'Waiting'}</span></div>
          <LiveChart values={angles} />
          <div className="sensor-row">
            <div><span>Accel X</span><strong>{latest?.accel_x?.toFixed(2) ?? '0.00'}</strong></div>
            <div><span>Accel Y</span><strong>{latest?.accel_y?.toFixed(2) ?? '0.00'}</strong></div>
            <div><span>Accel Z</span><strong>{latest?.accel_z?.toFixed(2) ?? '0.00'}</strong></div>
            <div><span>Gyro Z</span><strong>{latest?.gyro_z?.toFixed(2) ?? '0.00'}</strong></div>
          </div>
        </article>

        <article className="panel session-panel">
          <div className="panel-head"><div><span className="eyebrow orange">EXERCISE SESSION</span><h3>{activeSession ? activeSession.exercise_name : 'Start tracking'}</h3></div></div>
          {activeSession ? (
            <>
              <div className="rep-display"><strong>{activeSession.reps}</strong><span>/ {activeSession.target_reps} reps</span></div>
              <div className="progress-track"><span style={{ width: `${Math.min(100, activeSession.reps / Math.max(activeSession.target_reps, 1) * 100)}%` }} /></div>
              <p className="muted">ESP32 will add a rep whenever one complete movement cycle is detected.</p>
              <button className="danger-btn full" onClick={stopExercise} disabled={busy}>{busy ? 'Saving...' : 'Finish Session'}</button>
            </>
          ) : (
            <>
              <label>Exercise type<select value={exercise} onChange={(e) => setExercise(e.target.value)}>{EXERCISES.map((name) => <option key={name}>{name}</option>)}</select></label>
              <div className="target-box"><span>Daily target</span><strong>{target} reps</strong></div>
              {notice && <div className="alert error">{notice}</div>}
              <button className="primary-btn full" onClick={startExercise} disabled={busy}>{busy ? 'Starting...' : 'Start Exercise'}</button>
            </>
          )}
        </article>
      </section>
    </AppShell>
  )
}
