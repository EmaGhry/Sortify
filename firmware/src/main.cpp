#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>

#if __has_include("wifi_secrets.h")
#include "wifi_secrets.h"
static_assert(sizeof(SORTIFY_AP_PASSWORD) >= 9 && sizeof(SORTIFY_AP_PASSWORD) <= 64,
              "Use a Wi-Fi password with 8 to 63 characters.");
#endif

namespace {
constexpr uint8_t servoPin = 13;
constexpr uint8_t attentionLed = 33;
constexpr uint8_t servoChannel = 0;
constexpr uint32_t servoFrequency = 50;
constexpr uint8_t servoResolution = 16;
constexpr char commandHeader[] = "X-Sortify-Bench";

struct Destination {
  const char *name;
  uint8_t led;
  uint16_t pulseMicros;
};

// Calibrate with the horn unloaded before fitting a pointer.
constexpr Destination destinations[] = {
    {"glass", 25, 1100},
    {"metal", 26, 1350},
    {"plastic", 27, 1600},
    {"paper", 14, 1850},
    {"other", attentionLed, 2000},
};

WebServer server(80);
bool apReady = false;
bool servoAttached = false;

void indicate(uint8_t selectedLed) {
  for (const auto &destination : destinations) {
    digitalWrite(destination.led, selectedLed == destination.led ? HIGH : LOW);
  }
}

void movePointer(uint16_t pulseMicros) {
  const uint32_t duty = (static_cast<uint32_t>(pulseMicros) << servoResolution) /
                        (1000000 / servoFrequency);
  ledcWrite(servoChannel, duty);
  if (!servoAttached) {
    ledcAttachPin(servoPin, servoChannel);
    servoAttached = true;
  }
}

void handleSort() {
  server.sendHeader("Cache-Control", "no-store");
  if (server.header(commandHeader) != "1") {
    server.send(403, "application/json", "{\"error\":\"missing command header\"}");
    return;
  }
  if (server.args() != 1 || !server.hasArg("type")) {
    server.send(400, "application/json", "{\"error\":\"expected one material type\"}");
    return;
  }

  const String material = server.arg("type");
  for (const auto &destination : destinations) {
    if (material == destination.name) {
      movePointer(destination.pulseMicros);
      indicate(destination.led);
      server.send(200, "application/json", String("{\"material\":\"") + material + "\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"error\":\"invalid material\"}");
}
}  // namespace

void setup() {
  Serial.begin(115200);
  for (const auto &destination : destinations) pinMode(destination.led, OUTPUT);
  indicate(attentionLed);
  ledcSetup(servoChannel, servoFrequency, servoResolution);

#if __has_include("wifi_secrets.h")
  WiFi.mode(WIFI_AP);
  apReady = WiFi.softAP(SORTIFY_AP_SSID, SORTIFY_AP_PASSWORD);
  if (!apReady) {
    Serial.println("Sortify: access point setup failed");
    return;
  }

  const char *headers[] = {commandHeader};
  server.collectHeaders(headers, 1);
  server.on("/health", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "application/json", "{\"station\":\"sortify-bench\",\"version\":2}");
  });
  server.on("/sort", HTTP_GET, handleSort);
  server.begin();
  Serial.print("Sortify ESP32: ");
  Serial.println(WiFi.softAPIP());
#else
  Serial.println("Sortify: create firmware/include/wifi_secrets.h before flashing");
#endif
}

void loop() {
  if (apReady) server.handleClient();
  delay(2);
}
