'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then((result: { data: { session: unknown | null } }) => {
      router.replace(result.data.session ? '/dashboard' : '/login')
    })
  }, [router])

  return <main className="center-screen"><div className="loader" /><p>Loading RehabTrack...</p></main>
}
