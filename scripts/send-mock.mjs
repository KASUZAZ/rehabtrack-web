// Send fake rehabilitation sensor data without an ESP32.
// Usage:
//   API_BASE_URL=http://localhost:3000 DEVICE_API_KEY=your_secret npm run mock

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
const apiKey = process.env.DEVICE_API_KEY
const deviceCode = process.env.DEVICE_CODE || 'REHAB-ESP32-001'

if (!apiKey) {
  console.error('Missing DEVICE_API_KEY environment variable.')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let phase = 0
let wasBent = false

console.log(`Sending mock telemetry to ${baseUrl}/api/telemetry`)
console.log(`Device: ${deviceCode}`)

while (true) {
  phase += 0.22
  const normalized = (Math.sin(phase) + 1) / 2
  const bendAngle = normalized * 75
  const flexValue = Math.round(1500 + normalized * 1500)
  const motionAngle = Math.max(0, bendAngle * 0.82 + Math.sin(phase * 1.8) * 3)

  let repDetected = false
  if (!wasBent && bendAngle >= 55) wasBent = true
  if (wasBent && bendAngle <= 25) {
    wasBent = false
    repDetected = true
  }

  const qualityScore = Math.max(0, Math.min(100, Math.round(96 - Math.abs(bendAngle - motionAngle))))

  const response = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-api-key': apiKey,
    },
    body: JSON.stringify({
      device_code: deviceCode,
      flex_value: flexValue,
      bend_angle: Number(bendAngle.toFixed(2)),
      accel_x: Number((Math.sin(phase) * 1.3).toFixed(3)),
      accel_y: Number((Math.cos(phase) * 5.4).toFixed(3)),
      accel_z: 8.8,
      gyro_x: 0.02,
      gyro_y: 0.03,
      gyro_z: Number((Math.sin(phase * 1.5) * 0.18).toFixed(3)),
      motion_angle: Number(motionAngle.toFixed(2)),
      rep_detected: repDetected,
      quality_score: qualityScore,
    }),
  })

  const body = await response.text()
  console.log(new Date().toLocaleTimeString(), response.status, `bend=${bendAngle.toFixed(1)}`, repDetected ? 'REP!' : '', body)
  await sleep(500)
}
