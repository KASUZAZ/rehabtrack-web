export type Profile = {
  id: string
  full_name: string | null
  daily_target: number
  created_at: string
}

export type Device = {
  id: string
  patient_id: string
  device_code: string
  device_name: string
  enabled: boolean
  active_session_id: string | null
  created_at: string
}

export type ExerciseSession = {
  id: string
  patient_id: string
  exercise_name: string
  target_reps: number
  reps: number
  status: 'active' | 'completed' | 'cancelled'
  started_at: string
  ended_at: string | null
  avg_flex: number | null
  avg_motion_angle: number | null
  performance_score: number | null
}

export type SensorReading = {
  id: number
  patient_id: string
  device_id: string
  session_id: string | null
  flex_value: number
  bend_angle: number
  accel_x: number
  accel_y: number
  accel_z: number
  gyro_x: number
  gyro_y: number
  gyro_z: number
  motion_angle: number
  rep_detected: boolean
  quality_score: number
  created_at: string
}
