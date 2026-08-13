'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Device, Profile } from '@/lib/types'

export function usePatient() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login')
        setLoading(false)
        return
      }

      setUser(authData.user)

      const [{ data: profileData }, { data: deviceData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authData.user.id).single(),
        supabase.from('devices').select('*').eq('patient_id', authData.user.id).eq('enabled', true).maybeSingle(),
      ])

      setProfile(profileData as Profile | null)
      setDevice(deviceData as Device | null)
      setLoading(false)
    }

    load()

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) router.replace('/login')
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  return { user, profile, device, setProfile, setDevice, loading }
}
