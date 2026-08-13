# RehabTrack Web

A bright orange patient web portal for monitoring and analysing back / lower-limb rehabilitation exercises using:

**Flex Sensor + MPU6050 → ESP32 → Next.js Website → Supabase → Live Monitoring + Rep History**

## Included features

- Supabase email/password patient authentication.
- Patient-specific data isolation with Row Level Security (RLS).
- ESP32 device pairing with a unique device code.
- Live Flex Sensor + MPU6050 readings through Supabase Realtime.
- Live movement-angle graph.
- Automatic repetition counting from a complete bend/return cycle.
- Configurable daily target (default 20 reps/day).
- Active exercise session with Start / Finish controls.
- Exercise history with reps, target, performance score and status.
- Server-side telemetry endpoint protected by `DEVICE_API_KEY`.
- Supabase `service_role` key stays server-side only.
- Responsive desktop/mobile web UI.
- ESP32 Arduino example included in `esp32/rehab_sensor.ino`.

> Important: The included movement-quality score and thresholds are prototype heuristics, not a medical diagnosis or clinical assessment. Calibrate thresholds with the intended exercise protocol and qualified clinical input before real healthcare use.

## 1. Requirements

- Node.js 20.9 or newer.
- A Supabase project.
- ESP32 development board.
- Flex sensor wired to an ESP32 ADC pin (example uses GPIO 34).
- MPU6050 connected over I2C.

## 2. Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql`.
4. Go to **Authentication** and enable Email provider.
5. Copy `.env.example` to `.env.local`.
6. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEVICE_API_KEY`

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
DEVICE_API_KEY=A_LONG_RANDOM_DEVICE_SECRET
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_...` variable.

## 3. Install and run

### Cara paling mudah di Windows (sekali klik)

1. Klik dua kali `MULA_REHABTRACK.cmd`.
2. Pada kali pertama, launcher akan menyediakan `.env.local`. Isi empat nilai yang diminta, simpan, kemudian klik launcher sekali lagi.
3. Launcher akan memasang keperluan projek jika perlu, menghidupkan website, dan membuka `http://localhost:3000` secara automatik.
4. Biarkan tetingkap RehabTrack terbuka semasa website digunakan. Tekan `Ctrl+C` untuk mematikannya.

Anda masih perlu membuat projek Supabase dan menjalankan `supabase/schema.sql` sekali sahaja. Selepas setup awal itu, penggunaan harian hanya perlu klik `MULA_REHABTRACK.cmd`.

### Cara manual

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Patient flow

1. Register a patient account.
2. Sign in.
3. Open **Device**.
4. Pair a device code such as `REHAB-ESP32-001`.
5. Set the daily goal (for example 20 reps/day).
6. Open **Dashboard**.
7. Choose an exercise and press **Start Exercise**.
8. ESP32 readings appear live.
9. Every complete repetition increments the active session.
10. Press **Finish Session** to calculate and save the basic performance result.
11. Open **History** to review previous sessions.

## 5. ESP32 setup

Open `esp32/rehab_sensor.ino` and change:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://YOUR-DOMAIN.com/api/telemetry";
const char* DEVICE_API_KEY = "SAME_VALUE_AS_WEBSITE_ENV";
const char* DEVICE_CODE = "REHAB-ESP32-001";
```

Install Arduino libraries:

- Adafruit MPU6050
- Adafruit Unified Sensor

The ESP32 prototype sends a sample about every 250 ms. Adjust `SEND_INTERVAL_MS` if you need a different frequency.

### Flex sensor calibration

Update these values using your real straight/bent readings:

```cpp
const int FLEX_STRAIGHT = 1500;
const int FLEX_BENT = 3000;
```

Rep detection currently uses hysteresis:

```cpp
const float REP_ENTER_ANGLE = 55.0;
const float REP_EXIT_ANGLE = 25.0;
```

A rep is counted when the movement crosses the enter threshold and returns below the exit threshold. This prevents one held movement from being counted many times.

## 6. Telemetry API format

POST to:

```text
/api/telemetry
```

Header:

```text
x-device-api-key: YOUR_DEVICE_API_KEY
Content-Type: application/json
```

Example body:

```json
{
  "device_code": "REHAB-ESP32-001",
  "flex_value": 2341,
  "bend_angle": 48.2,
  "accel_x": 0.12,
  "accel_y": 5.52,
  "accel_z": 8.04,
  "gyro_x": 0.01,
  "gyro_y": 0.03,
  "gyro_z": 0.09,
  "motion_angle": 34.8,
  "rep_detected": false,
  "quality_score": 88
}
```

## 7. Database structure

### `profiles`
Patient name + daily rep target.

### `devices`
Maps one ESP32 device code to a patient and stores the active session ID.

### `exercise_sessions`
Stores exercise name, target reps, actual reps, timestamps and basic performance score.

### `sensor_readings`
Stores individual Flex Sensor + MPU6050 samples for live display and analysis.

## 8. Security model

Browser access uses the Supabase publishable key and RLS. Policies check `auth.uid()` against `patient_id`, so patient A cannot select patient B's rows through the normal authenticated client.

The ESP32 does **not** receive the Supabase service-role key. It sends data to the Next.js server endpoint with a separate device API key. The server uses the service-role credential privately to resolve the device-to-patient mapping and insert telemetry.

For a production healthcare deployment, add stronger per-device credentials, key rotation, audit logs, rate limiting, TLS certificate verification on ESP32, consent/privacy controls, retention rules and the security/compliance requirements applicable to your jurisdiction.

## 9. Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Add the four environment variables from `.env.example`.
4. Deploy.
5. Put the deployed HTTPS URL into `API_URL` in the ESP32 sketch.

## Main folders

```text
rehabtrack-web/
├─ src/
│  ├─ app/
│  │  ├─ api/telemetry/route.ts
│  │  ├─ dashboard/page.tsx
│  │  ├─ device/page.tsx
│  │  ├─ history/page.tsx
│  │  ├─ login/page.tsx
│  │  ├─ register/page.tsx
│  │  └─ globals.css
│  ├─ components/
│  ├─ hooks/
│  └─ lib/
├─ supabase/schema.sql
├─ esp32/rehab_sensor.ino
├─ .env.example
└─ README.md
```

## 10. Test live tracking without ESP32

After the website and Supabase are running, pair device code `REHAB-ESP32-001`, start an exercise, then open another terminal:

```bash
API_BASE_URL=http://localhost:3000 DEVICE_API_KEY=YOUR_DEVICE_API_KEY npm run mock
```

On Windows PowerShell:

```powershell
$env:API_BASE_URL="http://localhost:3000"
$env:DEVICE_API_KEY="YOUR_DEVICE_API_KEY"
npm run mock
```

The dashboard should begin moving in real time and repetitions should increase whenever the mock bend cycle completes.
