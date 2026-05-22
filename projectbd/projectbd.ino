// ═══════════════════════════════════════════════════════════════
// Proyecto: Control de Microclima - Invernaderos Cundinamarca
// Hardware: ESP32 DevKit V1 + DHT22 + YL-69 + LDR + MQ-2
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── WiFi ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "U-SIGLOXXI"; 
const char* WIFI_PASSWORD = "UdeCsigloXXI";

// ── API ───────────────────────────────────────────────────────
const char* API_URL = "https://api-invernaderos-inicial.onrender.com/api/Lecturas";

// ── IDs ───────────────────────────────────────────────────────
const int ID_SENSOR      = 1;
const int ID_INVERNADERO = 1;

// ── Pines ─────────────────────────────────────────────────────
#define PIN_DHT22  4
#define PIN_YL69   34
#define PIN_LDR    35
#define PIN_MQ2    32

// ── Intervalo de envío (2 minutos) ────────────────────────────
#define INTERVALO_MS 2000

// ── DHT ───────────────────────────────────────────────────────
DHT dht(PIN_DHT22, DHT22);
unsigned long ultimoEnvio = 0;

// ── Buffer suavizado LDR ──────────────────────────────────────
float bufferLuz[5] = {0, 0, 0, 0, 0};
int idxLuz = 0;

// ═══════════════════════════════════════════════════════════════
// WIFI
// ═══════════════════════════════════════════════════════════════
void conectarWiFi() {
  Serial.print("📶 Conectando a ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Falló conexión WiFi");
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPERATURA
// ═══════════════════════════════════════════════════════════════
float leerTemperatura() {
  float t = dht.readTemperature();
  return isnan(t) ? 0.0 : t;
}

// ═══════════════════════════════════════════════════════════════
// HUMEDAD AMBIENTAL
// ═══════════════════════════════════════════════════════════════
float leerHumedad() {
  float h = dht.readHumidity();
  return isnan(h) ? 0.0 : h;
}

// ═══════════════════════════════════════════════════════════════
// HUMEDAD SUELO
// ═══════════════════════════════════════════════════════════════
float leerHumedadSuelo() {
  int raw = analogRead(PIN_YL69);
  //Serial.printf("🌱 Suelo raw: %d\n", raw);
  float porcentaje = map(raw, 4095, 0, 0, 100);
  return constrain(porcentaje, 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// LUMINOSIDAD
// ═══════════════════════════════════════════════════════════════
float leerLuminosidad() {
  int raw = analogRead(PIN_LDR);
  //Serial.printf("☀️ LDR raw: %d\n", raw);
  float luz = map(raw, 0, 4095, 0, 100);
  bufferLuz[idxLuz] = luz;
  idxLuz = (idxLuz + 1) % 5;
  float suma = 0;
  for (int i = 0; i < 5; i++) suma += bufferLuz[i];
  return suma / 5.0;
}

// ═══════════════════════════════════════════════════════════════
// CALIDAD AIRE — MQ2
// ═══════════════════════════════════════════════════════════════
float leerCalidadAire() {
  int raw = analogRead(PIN_MQ2);
  //Serial.printf("💨 MQ2 raw: %d\n", raw);
  float porcentaje = ((float)raw / 4095.0) * 100.0;
  return constrain(porcentaje, 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// ENVIAR
// ═══════════════════════════════════════════════════════════════
/*void enviarDatos(String jsonString) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonString);
  if (httpCode == 200) {
    Serial.println("✅ Enviado correctamente");
  } else {
    Serial.printf("❌ Error HTTP: %d\n", httpCode);
  }
  http.end();
}*/
void enviarDatos(String jsonString) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  
  // Permitir HTTPS sin verificar certificado
  http.begin("https://api-invernaderos-inicial.onrender.com/api/Lecturas");
  http.addHeader("Content-Type", "application/json");
  
  // Seguir redirecciones
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  
  // Timeout más largo por si Render está dormido
  http.setTimeout(15000);

  int httpCode = http.POST(jsonString);

  if (httpCode == 200) {
    Serial.println("✅ Enviado correctamente");
  } else {
    Serial.printf("❌ Error HTTP: %d\n", httpCode);
    Serial.println(http.getString());
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════
// LECTURA Y ENVÍO
// ═══════════════════════════════════════════════════════════════
void leerYEnviarDatos() {
  Serial.println("\n────────────────────────────");

  float temperatura  = leerTemperatura();
  float humedad      = leerHumedad();
  float humedadSuelo = leerHumedadSuelo();
  float luminosidad  = leerLuminosidad();
  float calidadAire  = leerCalidadAire();

  Serial.printf("🌡️ Temp: %.2f °C\n",   temperatura);
  Serial.printf("💧 Hum:  %.2f %%\n",   humedad);
  Serial.printf("🌱 Suelo: %.2f %%\n",  humedadSuelo);
  Serial.printf("☀️ Luz:  %.2f %%\n",   luminosidad);
  Serial.printf("💨 Aire: %.2f %%\n",   calidadAire);

  StaticJsonDocument<256> doc;
  doc["idSensor"]      = ID_SENSOR;
  doc["idInvernadero"] = ID_INVERNADERO;
  doc["temperatura"]   = temperatura;
  doc["humedad"]       = humedad;
  doc["humedadSuelo"]  = humedadSuelo;
  doc["luminosidad"]   = luminosidad;
  doc["calidadAire"]   = calidadAire;

  String json;
  serializeJson(doc, json);
  Serial.println("📤 JSON:");
  Serial.println(json);

  enviarDatos(json);
}

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000);
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║  Sistema IoT - Invernadero           ║");
  Serial.println("║  Cundinamarca - ESP32 DevKit V1      ║");
  Serial.println("╚══════════════════════════════════════╝");
  conectarWiFi();
}

// ═══════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    conectarWiFi();
  }
  if (millis() - ultimoEnvio >= INTERVALO_MS) {
    ultimoEnvio = millis();
    leerYEnviarDatos();
  }
}