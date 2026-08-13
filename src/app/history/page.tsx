'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { usePatient } from '@/hooks/usePatient'
import { createClient } from '@/lib/supabase/client'
import type { ExerciseSession } from '@/lib/types'

export default function HistoryPage() {
  const { user, profile, device, loading } = usePatient()
  const [sessions, setSessions] = useState<ExerciseSession[]>([])

  useEffect(() => {
    if (!user) return
    createClient().from('exercise_sessions').select('*').eq('patient_id', user.id).order('started_at', { ascending: false }).then((result: { data: unknown[] | null }) => setSessions((result.data || []) as ExerciseSession[]))
  }, [user])

  if (loading) return <main className="center-screen"><div className="loader" /></main>

  return (
    <AppShell name={profile?.full_name} deviceConnected={!!device}>
      <div className="page-title"><div><span className="eyebrow orange">PROGRESS RECORD</span><h1>Exercise History</h1><p>Every completed or active exercise session linked to your patient account.</p></div></div>
      <section className="panel table-panel">
        {sessions.length === 0 ? <div className="empty-state"><strong>No sessions yet</strong><p>Start an exercise from the dashboard and your reps will appear here.</p></div> : (
          <div className="table-scroll"><table><thead><tr><th>Date</th><th>Exercise</th><th>Reps</th><th>Target</th><th>Performance</th><th>Status</th></tr></thead><tbody>
            {sessions.map((s) => <tr key={s.id}><td>{new Date(s.started_at).toLocaleString()}</td><td><strong>{s.exercise_name}</strong></td><td>{s.reps}</td><td>{s.target_reps}</td><td>{s.performance_score == null ? '—' : `${s.performance_score}%`}</td><td><span className={`status ${s.status}`}>{s.status}</span></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </AppShell>
  )
}
