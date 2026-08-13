/*
  RehabTrack ESP32 prototype
  Flex Sensor + MPU6050 -> ESP32 -> RehabTrack /api/telemetry

  Arduino libraries:
  - Adafruit MPU6050
  - Adafruit Unified Sensor

  IMPORTANT:
  1. Change WIFI_SSID / WIFI_PASSWORD.
  2. Set API_URL to your deployed HTTPS website.
  3. DEVICE_API_KEY must match .env.local / Vercel environment variable.
  4. DEVICE_CODE must match the code paired in the website.
  5. Calibrate FLEX_STRAIGHT and FLEX_BENT for your own sensor placement.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://YOUR-DOMAIN.com/api/telemetry";
const char* DEVICE_API_KEY = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";
const char* DEVICE_CODE = "REHAB-ESP32-001";

const int FLEX_PIN = 34;
const int FLEX_STRAIGHT = 1500; // calibrate
const int FLEX_BENT = 3000;     // calibrate

// Hysteresis thresholds for one complete repetition.
const float REP_ENTER_ANGLE = 55.0;
const float REP_EXIT_ANGLE = 25.0;

Adafruit_MPU6050 mpu;
bool inRep = false;
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 250;

float clampFloat(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

float flexToAngle(int raw) {
  float angle = (raw - FLEX_STRAIGHT) * 90.0 / (FLEX_BENT - FLEX_STRAIGHT);
  return clampFloat(angle, 0.0, 90.0);
}

int movementQuality(float bendAngle, float motionAngle) {
  // Prototype-only heuristic, NOT a medical assessment.
  // Reward a controlled range and penalize extreme/very low movement.
  float difference = fabs(bendAngle - motionAngle);
  int score = 100 - (int)(difference * 1.2);
  if (motionAngle < 10 || motionAngle > 100) score -= 15;
  return (int)clampFloat(score, 0, 100);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(" connected.");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  Wire.begin();

  if (!mpu.begin()) {
    Serial.println("MPU6050 not found. Check wiring.");
    while (1) delay(1000);
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (millis() - lastSend < SEND_INTERVAL_MS) return;
  lastSend = millis();

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  int flexRaw = analogRead(FLEX_PIN);
  float bendAngle = flexToAngle(flexRaw);

  // Estimate tilt from accelerometer in degrees.
  float motionAngle = atan2(a.acceleration.y,
                            sqrt(a.acceleration.x * a.acceleration.x +
                                 a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  motionAngle = fabs(motionAngle);

  bool repDetected = false;
  if (!inRep && bendAngle >= REP_ENTER_ANGLE) {
    inRep = true;
  } else if (inRep && bendAngle <= REP_EXIT_ANGLE) {
    inRep = false;
    repDetected = true; // one full bend-and-return cycle
  }

  int quality = movementQuality(bendAngle, motionAngle);

  String json = "{";
  json += "\"device_code\":\"" + String(DEVICE_CODE) + "\",";
  json += "\"flex_value\":" + String(flexRaw) + ",";
  json += "\"bend_angle\":" + String(bendAngle, 2) + ",";
  json += "\"accel_x\":" + String(a.acceleration.x, 3) + ",";
  json += "\"accel_y\":" + String(a.acceleration.y, 3) + ",";
  json += "\"accel_z\":" + String(a.acceleration.z, 3) + ",";
  json += "\"gyro_x\":" + String(g.gyro.x, 3) + ",";
  json += "\"gyro_y\":" + String(g.gyro.y, 3) + ",";
  json += "\"gyro_z\":" + String(g.gyro.z, 3) + ",";
  json += "\"motion_angle\":" + String(motionAngle, 2) + ",";
  json += "\"rep_detected\":" + String(repDetected ? "true" : "false") + ",";
  json += "\"quality_score\":" + String(quality);
  json += "}";

  WiFiClientSecure client;
  client.setInsecure(); // Prototype convenience. Use CA certificate validation in production.

  HTTPClient http;
  if (http.begin(client, API_URL)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-api-key", DEVICE_API_KEY);
    int status = http.POST(json);
    Serial.printf("POST %d | flex=%d bend=%.1f motion=%.1f rep=%s\n",
                  status, flexRaw, bendAngle, motionAngle, repDetected ? "YES" : "no");
    if (status > 0) Serial.println(http.getString());
    http.end();
  }
}
