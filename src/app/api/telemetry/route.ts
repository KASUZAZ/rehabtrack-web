import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type TelemetryBody = {
  device_code?: string
  flex_value?: number
  bend_angle?: number
  accel_x?: number
  accel_y?: number
  accel_z?: number
  gyro_x?: number
  gyro_y?: number
  gyro_z?: number
  motion_angle?: number
  rep_detected?: boolean
  quality_score?: number
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) throw new Error('Server Supabase environment variables are missing.')
  return createClient(url, secretKey, { auth: { persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const expectedKey = process.env.DEVICE_API_KEY
    const suppliedKey = request.headers.get('x-device-api-key')
    if (!expectedKey || suppliedKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 })
    }

    const body = (await request.json()) as TelemetryBody
    if (!body.device_code) {
      return NextResponse.json({ error: 'device_code is required' }, { status: 400 })
    }

    const supabase = adminClient()
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id,patient_id,active_session_id,enabled')
      .eq('device_code', body.device_code)
      .eq('enabled', true)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Unknown or disabled device' }, { status: 404 })
    }

    const reading = {
      patient_id: device.patient_id,
      device_id: device.id,
      session_id: device.active_session_id,
      flex_value: Number(body.flex_value ?? 0),
      bend_angle: Number(body.bend_angle ?? 0),
      accel_x: Number(body.accel_x ?? 0),
      accel_y: Number(body.accel_y ?? 0),
      accel_z: Number(body.accel_z ?? 0),
      gyro_x: Number(body.gyro_x ?? 0),
      gyro_y: Number(body.gyro_y ?? 0),
      gyro_z: Number(body.gyro_z ?? 0),
      motion_angle: Number(body.motion_angle ?? 0),
      rep_detected: Boolean(body.rep_detected),
      quality_score: Math.max(0, Math.min(100, Number(body.quality_score ?? 0))),
    }

    const { error: insertError } = await supabase.from('sensor_readings').insert(reading)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    let repCount: number | null = null
    if (reading.rep_detected && device.active_session_id) {
      const { data, error } = await supabase.rpc('increment_session_rep', { p_session_id: device.active_session_id })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      repCount = Number(data)
    }

    return NextResponse.json({
      ok: true,
      active_session: device.active_session_id,
      rep_count: repCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ service: 'RehabTrack Telemetry API', status: 'online' })
}
