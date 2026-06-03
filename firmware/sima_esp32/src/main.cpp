/**
 * @file main.cpp
 * @brief Firmware SIMA - Sistema Inteligente de Mistura Automatizada (ESP32)
 * @details Firmware atualizado com máquina de estados sequencial em 7 etapas,
 * comunicação via MQTT (HiveMQ), resiliência de conexão e operação não-bloqueante.
 *
 * ==============================================================================
 * DIAGRAMA DE PINAGEM COMPLETO (HARDWARE ESP32)
 * ==============================================================================
 * PINO ESP32   | PERIFÉRICO / COMPONENTE
 * -------------|----------------------------------------------------------------
 * GPIO19 (OUT) | Canal 1 Relay (S1 - Válvula solenóide de saída)
 * GPIO21 (OUT) | Canal 2 Relay (S2 - Bomba 1 - Entrada de líquido)
 * GPIO22 (OUT) | Canal 3 Relay (S3 - Bomba 3 - Saída pra usuário)
 * GPIO23 (OUT) | Canal 4 Relay (S4 - Bomba 2 - Saída de misturado p/ reservatório)
 * GPIO25 (OUT) | Canal 5 Relay (S5 - Motor eixo sem fim, pó para batedor)
 * GPIO18 (OUT) | PWM Motor de agitação
 * GPIO32 (IN)  | Sensor de nível magnético ON/OFF (Recipiente armazenamento)
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "soc/soc.h"           // Necessario para desabilitar o brownout
#include "soc/rtc_cntl_reg.h"  // Necessario para desabilitar o brownout
#include "driver/gpio.h"        // API ESP-IDF para init de GPIO sem glitch

// ==============================================================================
// CONFIGURAÇÕES DE REDE E MQTT
// ==============================================================================
const char* WIFI_SSID = "Sonvi"; // Coloque o nome da rede do seu celular
const char* WIFI_PASS = "input237";    // Coloque a senha do seu celular

// MANTIDO O USO DO TLS: Instâncias do HiveMQ Cloud não aceitam porta 1883.
// Se for utilizar um broker local (ex: Mosquitto), altere a porta para 1883 e remova a 
// camada WiFiClientSecure usando apenas WiFiClient.
const char* MQTT_HOST = "049fb2c96f2a458c8b99e9c1bec35df8.s1.eu.hivemq.cloud";
const int   MQTT_PORT = 8883; 
const char* MQTT_USER = "sysima";
const char* MQTT_PASS = "|L4215Z#ErV";

// ID do cliente gerado de forma dinâmica com o MAC Address (ver setup)
String mqtt_client_id = "ESP32_Mixer_"; 

// ==============================================================================
// PINAGEM E CONFIGURAÇÕES DE HARDWARE
// ==============================================================================
const int PIN_RELAY_S1 = 19;    // Válvula solenóide de saída
const int PIN_RELAY_S2 = 21;    // Bomba 1 - Entrada de líquido
const int PIN_RELAY_S3 = 22;    // Bomba 3 - Saída pra usuário
const int PIN_RELAY_S4 = 23;    // Bomba 2 - Saída de misturado p/ reservatório
const int PIN_RELAY_S5 = 25;    // Motor eixo sem fim (pó para batedor)
const int PIN_PWM_MOTOR = 18;   // PWM Motor de agitação
const int PIN_LEVEL_SENSOR = 32; // Sensor de nível magnético (0 ou 1)

// PWM - Motor de Agitação (BTS7960 / IBT-2)
// RPWM → P18 | LPWM → GND | R_EN e L_EN → 3.3V (fixos)
// 5 kHz: switching losses ~4x menores que 20 kHz → driver aquece menos.
// Compromisso aceito: leve ruído audível do motor (irrelevante em ambiente industrial).
const int PWM_CHANNEL    = 0;
const int PWM_FREQ       = 17000;   // 17 kHz — acima do limiar auditivo da maioria dos adultos, perdas menores que 20 kHz
const int PWM_RESOLUTION = 8;     // 0-255
uint8_t   motorSpeed     = 100;    // ~39 % duty cycle (−50 % de 200)
const int     MOTOR_RAMP_MS  = 4000;  // ms para atingir a velocidade alvo (partida suave)
const uint8_t MOTOR_MIN_DUTY = 30;    // duty inicial — acima da zona morta do BTS7960

// Relés mecânicos, módulos Low-Level Trigger (bobina ativa com sinal LOW).
// S1-S5: todos no mesmo nível lógico.
const int RELAY_ON  = LOW;
const int RELAY_OFF = HIGH;

// ==============================================================================
// TEMPOS (ms) - Parâmetros da Receita Automática
// ==============================================================================
// Parametros do processo configuravel por receita (enviada no comando start)
int cfg_liquid1_time    = 1000;  // ms 1a injecao (~20% do liquido)
int cfg_powder_time     = 3000;  // ms eixo sem fim
int cfg_liquid2_time    = 4000;  // ms 2a injecao (restante)
int cfg_pre_mix_delay   = 500;   // ms pausa antes de agitar
int cfg_mix_time        = 20000; // ms duracao da agitacao
uint8_t cfg_motor_speed = 48;    // duty cycle PWM motor agitacao
int cfg_post_mix_delay  = 1000;  // ms pausa apos agitacao
int cfg_extract_time    = 6000;  // ms extracao
int cfg_valve_delay     = 300;   // ms delay valvula solenoide
int cfg_serve_time      = 5000;  // ms servico ao usuario
int s5PulseOnMs         = 400;   // ms rele S5 ON  (configuravel via MQTT)
int s5PulseOffMs        = 800;   // ms rele S5 OFF (configuravel via MQTT)

const int HEARTBEAT_INTERVAL = 30000; // Tempo entre heartbeats (Status MQTT)
const int RECONNECT_INTERVAL = 5000;  // Tempo de retry do WiFi/MQTT

// ==============================================================================
// MÁQUINA DE ESTADOS (FSM - Finite State Machine)
// ==============================================================================
enum ProcessState {
  IDLE,
  STEP0_CHECK,      // Verificação inicial do nível
  STEP1_LIQUID1,     // S2: Entrada de líquido
  STEP2_POWDER,     // S5: Adição de pó (motor eixo sem fim)
  STEP3_LIQUID2,   // S2: 2a injecao de liquido (restante)
  STEP4_MIX,        // PWM P18: Agitação
  STEP5_EXTRACT,    // S4: Saída de misturado p/ reservatório
  STEP6_SERVE,      // S1 e S3: Servir no copo
  STEP7_DONE,       // Fim do Processo
  STOPPED,          // Parada de Emergência invocada
  ERROR_STATE       // Erro geral (ex: recipiente cheio)
};

ProcessState currentState = IDLE;

// Temporizadores
unsigned long stepStartTime = 0;     // Tempo em que o passo atual começou
unsigned long lastHeartbeat = 0;     // Último envio de status/heartbeat
unsigned long lastReconnectAttempt = 0; 

// Rampa suave do motor
uint8_t       motorCurrentDuty = 0;
bool          motorRamping     = false;
unsigned long motorRampStart   = 0;
uint8_t       motorRampTarget  = 0;

// Pulso manual S5 (eixo sem fim)
bool          s5PulseActive = false;
unsigned long s5PulseStart  = 0;

// ==============================================================================
// OBJETOS GLOBAIS
// ==============================================================================
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Certificado Raiz ISRG Root X1 p/ conexão segura no HiveMQ Cloud
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFazCCA1OgAwIBAgIRAANY70NnRO/M7eA3AozJcEEwDQYJKoZIhvcNAQELBQAw\n" \
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n" \
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n" \
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n" \
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n" \
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJ1iAqeptBwTIXBTA\n" \
"Xm0Y+f+d+A0L05Nopk0+l6yR9a06k781kX9iI2/7F/4t8a6JpD2K0R80dM7pC0A8\n" \
"0eP5p+sM4k8kUaP3A9Yh4Tz7v4j4hE4b1w8uT2aL9x4mKqI8jW6T/n3n7h2D2o9E\n" \
"iR8L7iI1f9Q9z1pL7x6e/T2L0a3s0xM7Q7e8iG3Q/k+F4oY+U6E+XW8/qX5xR4z\n" \
"L/T4qT4E8v4J0E9T4Y1PZz1o0a7g7G1g5/X7E4I5/v4y4D6D6b6r7O7O6A9Yy/q5\n" \
"vT1tQ8V6b0p1g6tHq5b1L7/4u+l/k8A+H8o1s2q9/k6K/W9Q0v6+G8K2T4v4q8O\n" \
"6fT+xY0T5p3D0a9D3wE4K7p4f5bY8M6j8I7Y8/h2r6Z5i7R3H7qL9P3n7f1k3\n" \
"-----END CERTIFICATE-----\n";

// ==============================================================================
// PROTÓTIPOS DE FUNÇÕES
// ==============================================================================
void setupHardware();
void stopAll();
void connectWiFi();
void connectMQTT();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void runProcess();
void changeState(ProcessState newState);
void publishStatus(const char* status_str, int step, const char* step_name);
void publishEvent(const char* event_msg);
int readLevelSensor();
const char* getStatusString();
int getCurrentStepNum();
const char* getCurrentStepName();
void startMotorRamp(uint8_t targetDuty);
void stopMotor();
void updateMotorRamp();
void updateS5Pulse();

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Desabilita reset por brownout

  Serial.begin(115200);
  Serial.println("\n[SIMA] Iniciando firmware...");

  setupHardware();

  // Gera ID único de cliente MQTT com o MAC Address
  mqtt_client_id += WiFi.macAddress();
  mqtt_client_id.replace(":", "");

  connectWiFi();

  espClient.setInsecure(); // Desabilita verificação de certificado (raiz autoassinada)
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(onMqttMessage);
  client.setBufferSize(512);

  connectMQTT();

  Serial.println("[SIMA] Setup concluído.");
}

// ==============================================================================
// LOOP PRINCIPAL
// ==============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Manutenção da Conexão WiFi e MQTT (Não bloqueante)
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - lastReconnectAttempt >= RECONNECT_INTERVAL) {
      Serial.println("[WIFI] Reconectando WiFi...");
      WiFi.disconnect();
      WiFi.reconnect();
      lastReconnectAttempt = currentMillis;
    }
  } else {
    if (!client.connected()) {
      if (currentMillis - lastReconnectAttempt >= RECONNECT_INTERVAL) {
        connectMQTT();
        lastReconnectAttempt = currentMillis;
      }
    } else {
      client.loop();
    }
  }

  // 2. Rodar a máquina de estados não-bloqueante
  runProcess();

  // 3. Rampa suave do motor (não-bloqueante)
  updateMotorRamp();
  updateS5Pulse();

  // 3. Heartbeat / Status
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    if (client.connected()) {
       publishStatus(getStatusString(), getCurrentStepNum(), getCurrentStepName());
       
       char sensorMsg[10];
       itoa(readLevelSensor(), sensorMsg, 10);
       client.publish("mixer/sensor/level", sensorMsg);
    }
    lastHeartbeat = currentMillis;
  }
}

// ==============================================================================
// FUNÇÕES DA MÁQUINA DE ESTADOS
// ==============================================================================

/**
 * @brief Lógica principal da máquina de estados. Chamada repetidamente no loop.
 * @details Esta função apenas verifica se o tempo de uma etapa já decorreu para
 *          avançar para a próxima. As ações de ligar/desligar atuadores
 *          são gerenciadas pela função changeState.
 */
void runProcess() {
  // A máquina de estados só opera se não estiver em um estado de repouso.
  if (currentState == IDLE || currentState == STOPPED || currentState == ERROR_STATE || currentState == STEP7_DONE) {
    return;
  }

  unsigned long elapsed = millis() - stepStartTime;

  switch (currentState) {
    case STEP1_LIQUID1:
      if (elapsed >= (unsigned long)cfg_liquid1_time) changeState(STEP2_POWDER);
      break;

    case STEP2_POWDER: {
      if (elapsed >= (unsigned long)cfg_powder_time) { changeState(STEP3_LIQUID2); break; }
      unsigned long cycle = elapsed % ((unsigned long)(s5PulseOnMs + s5PulseOffMs));
      digitalWrite(PIN_RELAY_S5, cycle < (unsigned long)s5PulseOnMs ? RELAY_ON : RELAY_OFF);
      break;
    }

    case STEP3_LIQUID2:
      if (elapsed >= (unsigned long)cfg_liquid2_time) changeState(STEP4_MIX);
      break;

    case STEP4_MIX: {
      unsigned long t1 = (unsigned long)cfg_pre_mix_delay;
      unsigned long t2 = t1 + (unsigned long)cfg_mix_time;
      if (elapsed >= t1 && !motorRamping && motorCurrentDuty == 0) startMotorRamp(motorSpeed);
      if (elapsed >= t2) changeState(STEP5_EXTRACT);
      break;
    }

    case STEP5_EXTRACT: {
      if (readLevelSensor() == LOW) { publishEvent("Reservatorio cheio. Extracao interrompida."); changeState(STEP6_SERVE); break; }
      unsigned long t1 = (unsigned long)cfg_post_mix_delay;
      unsigned long t2 = t1 + (unsigned long)cfg_extract_time;
      if (elapsed >= t1 && elapsed < t2) digitalWrite(PIN_RELAY_S4, RELAY_ON);
      if (elapsed >= t2) changeState(STEP6_SERVE);
      break;
    }

    case STEP6_SERVE: {
      unsigned long t1 = (unsigned long)cfg_valve_delay;
      unsigned long t2 = t1 + (unsigned long)cfg_serve_time;
      unsigned long t3 = t2 + 500UL;
      if (elapsed < t3) digitalWrite(PIN_RELAY_S1, RELAY_ON);
      if (elapsed >= t1 && elapsed < t2) digitalWrite(PIN_RELAY_S3, RELAY_ON);
      if (elapsed >= t3) changeState(STEP7_DONE);
      break;
    }

    default:
      break;
  }
}

/**
 * @brief Realiza a transição entre estados, executando ações de saída e entrada.
 * @details Esta função centraliza a lógica de ligar e desligar atuadores.
 *          Garante que ao entrar em um novo estado, o atuador do estado
 *          anterior seja desligado.
 */
void changeState(ProcessState newState) {
  currentState  = newState;
  stepStartTime = millis();

  // --- Acoes de ENTRADA do novo estado ---
  switch (newState) {
    case STEP0_CHECK:
      publishEvent("Etapa 0: Verificando sensor de nivel...");
      if (readLevelSensor() == LOW) { publishEvent("ERRO: Reservatorio cheio. Abortado."); changeState(ERROR_STATE); }
      else { changeState(STEP1_LIQUID1); }
      break;
    case STEP1_LIQUID1: digitalWrite(PIN_RELAY_S2, RELAY_ON); break;
    case STEP2_POWDER:  digitalWrite(PIN_RELAY_S2, RELAY_OFF); break;       // fim STEP1
    case STEP3_LIQUID2: digitalWrite(PIN_RELAY_S2, RELAY_ON);  break;
    case STEP4_MIX:     digitalWrite(PIN_RELAY_S2, RELAY_OFF); break;       // fim STEP3
    case STEP5_EXTRACT: stopMotor(); break;                                  // fim STEP4
    case STEP6_SERVE:   digitalWrite(PIN_RELAY_S4, RELAY_OFF); break;       // fim STEP5
    case STEP7_DONE:
      publishEvent("Processo finalizado com sucesso!");
      publishStatus("idle", 7, "Finalizado");
      changeState(IDLE);
      break;
    case IDLE:
    case STOPPED:
    case ERROR_STATE:
      stopAll();
      break;
    default: break;
  }
}

// ==============================================================================
// FUNÇÕES DE COMUNICAÇÃO MQTT
// ==============================================================================
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String msgStr = "";
  for (int i = 0; i < length; i++) {
    msgStr += (char)payload[i];
  }

  Serial.printf("[MQTT] Tópico: %s | Payload: %s\n", topic, msgStr.c_str());

  if (topicStr == "mixer/command/start") {
    // Não inicia caso já esteja rodando uma tarefa
    if (currentState != IDLE && currentState != STOPPED && currentState != ERROR_STATE) {
      publishEvent("Ignorado: Um processo ja esta em andamento.");
      return;
    }
    
    // Aplica parametros da receita se enviados no payload
    { StaticJsonDocument<512> rd; if (!deserializeJson(rd, msgStr) && rd.size() > 0) {
      if (rd.containsKey("liquid1_time"))   cfg_liquid1_time   = rd["liquid1_time"];
      if (rd.containsKey("powder_time"))    cfg_powder_time    = rd["powder_time"];
      if (rd.containsKey("liquid2_time"))   cfg_liquid2_time   = rd["liquid2_time"];
      if (rd.containsKey("pre_mix_delay"))  cfg_pre_mix_delay  = rd["pre_mix_delay"];
      if (rd.containsKey("mix_time"))       cfg_mix_time       = rd["mix_time"];
      if (rd.containsKey("motor_speed"))    { cfg_motor_speed  = rd["motor_speed"]; motorSpeed = cfg_motor_speed; }
      if (rd.containsKey("post_mix_delay")) cfg_post_mix_delay = rd["post_mix_delay"];
      if (rd.containsKey("extract_time"))   cfg_extract_time   = rd["extract_time"];
      if (rd.containsKey("valve_delay"))    cfg_valve_delay    = rd["valve_delay"];
      if (rd.containsKey("serve_time"))     cfg_serve_time     = rd["serve_time"];
      if (rd.containsKey("pulse_on"))       s5PulseOnMs        = rd["pulse_on"];
      if (rd.containsKey("pulse_off"))      s5PulseOffMs       = rd["pulse_off"];
    }}
    Serial.println("[SIMA] Iniciando novo processo...");
    changeState(STEP0_CHECK);
  }
  else if (topicStr == "mixer/command/stop") {
    Serial.println("[SIMA] PARADA DE EMERGENCIA INVOCADA!");
    stopAll();
    currentState = STOPPED;
    publishStatus("stopped", getCurrentStepNum(), "Processo Interrompido");
    publishEvent("Emergencia acionada via MQTT");
  }
  else if (topicStr == "mixer/command/status") {
    // Força o reenvio do status atual
    publishStatus(getStatusString(), getCurrentStepNum(), getCurrentStepName());
  }
  else if (topicStr == "mixer/command/actuator") {
    // Comando manual só é permitido se a máquina não estiver rodando o ciclo automático
    if (currentState != IDLE && currentState != STOPPED && currentState != ERROR_STATE) {
      publishEvent("Ignorado: Comando manual bloqueado durante o processo automatico.");
      return;
    }
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, msgStr);
    
    if (!error) {
      String actuator = doc["actuator"] | "";
      String stateStr = doc["state"] | "OFF";
      
      bool turnOn = (stateStr == "ON");
      int val = turnOn ? RELAY_ON : RELAY_OFF;
      
      if (actuator == "S1") digitalWrite(PIN_RELAY_S1, val);
      else if (actuator == "S2") digitalWrite(PIN_RELAY_S2, val);
      else if (actuator == "S3") digitalWrite(PIN_RELAY_S3, val);
      else if (actuator == "S4") digitalWrite(PIN_RELAY_S4, val);
      else if (actuator == "S5") { if (turnOn) { s5PulseActive = true; s5PulseStart = millis(); } else { s5PulseActive = false; digitalWrite(PIN_RELAY_S5, RELAY_OFF); } }
      else if (actuator == "MOTOR") { if (turnOn) startMotorRamp(motorSpeed); else stopMotor(); }
      String debugMsg = "Modo Debug: Atuador " + actuator + " alterado para " + stateStr;
      publishEvent(debugMsg.c_str());
    }
    else {
      Serial.printf("[ERRO] Falha ao decodificar JSON do atuador: %s\n", error.c_str());
    }
  }
  else if (topicStr == "mixer/command/pwm") {
    StaticJsonDocument<64> doc;
    DeserializationError error = deserializeJson(doc, msgStr);
    if (!error) {
      uint8_t speed = doc["speed"] | 200;
      motorSpeed = constrain(speed, 0, 255);
      String msg = "PWM motor: " + String(motorSpeed);
      publishEvent(msg.c_str());
    }
  }
  else if (topicStr == "mixer/command/s5pulse") {
    StaticJsonDocument<64> doc;
    DeserializationError error = deserializeJson(doc, msgStr);
    if (!error) {
      s5PulseOnMs  = constrain((int)(doc["on_ms"]  | 400), 50, 5000);
      s5PulseOffMs = constrain((int)(doc["off_ms"] | 800), 50, 10000);
      String msg = "S5 pulse ON=" + String(s5PulseOnMs) + "ms OFF=" + String(s5PulseOffMs) + "ms";
      publishEvent(msg.c_str());
    }
  }
}

void connectMQTT() {
  Serial.print("[MQTT] Tentando conectar ao Broker... ");
  // Last Will and Testament configurado para informar caso desconecte abruptamente
  if (client.connect(mqtt_client_id.c_str(), MQTT_USER, MQTT_PASS, "mixer/status", 0, true, "{\"status\":\"offline\"}")) {
    Serial.println(" Conectado!");
    
    client.subscribe("mixer/command/start");
    client.subscribe("mixer/command/stop");
    client.subscribe("mixer/command/status");
    client.subscribe("mixer/command/actuator");
    client.subscribe("mixer/command/pwm");
    client.subscribe("mixer/command/s5pulse");
    
    publishStatus(getStatusString(), getCurrentStepNum(), getCurrentStepName());
  } else {
    Serial.print(" Falhou, rc=");
    Serial.print(client.state());
    Serial.println();
  }
}

void publishStatus(const char* status_str, int step, const char* step_name) {
  if (!client.connected()) return;
  
  StaticJsonDocument<256> doc;
  doc["status"] = status_str;
  doc["step"] = step;
  doc["step_name"] = step_name;
  doc["level_sensor"] = readLevelSensor();
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("mixer/status", buffer);
}

void publishEvent(const char* event_msg) {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["event"] = event_msg;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("mixer/event", buffer);
}

// ==============================================================================
// HARDWARE E SEGURANÇA
// ==============================================================================
void setupHardware() {
  // Usa API ESP-IDF diretamente: gpio_set_level() escreve HIGH no registrador
  // de saida ANTES de gpio_set_direction() habilitar o driver de output.
  // Isso elimina o pulso LOW transiente que ocorre na abordagem Arduino
  // (digitalWrite+pinMode), e ativa o pull-up interno de 45k como protecao extra.
  // NOTA: o periodo de boot ROM (~200ms antes do setup()) nao e coberto aqui.
  // Para eliminar COMPLETAMENTE o glitch, adicione pull-up de 10k (3.3V->sinal)
  // em cada modulo relay.
  const gpio_num_t relayPins[] = {
    (gpio_num_t)PIN_RELAY_S1, (gpio_num_t)PIN_RELAY_S2,
    (gpio_num_t)PIN_RELAY_S3, (gpio_num_t)PIN_RELAY_S4,
    (gpio_num_t)PIN_RELAY_S5
  };
  for (const gpio_num_t pin : relayPins) {
    gpio_pullup_en(pin);                        // pull-up interno 45k
    gpio_set_level(pin, 1);                     // HIGH no registrador antes do driver
    gpio_set_direction(pin, GPIO_MODE_OUTPUT);  // drive imediato para HIGH
  }

  // Drive LOW antes do LEDC assumir: sem isso o pino flutua no boot e o
  // BTS7960 (R_EN/L_EN fixos em 3.3V) interpreta flutuação como HIGH e gira.
  gpio_set_level((gpio_num_t)PIN_PWM_MOTOR, 0);
  gpio_set_direction((gpio_num_t)PIN_PWM_MOTOR, GPIO_MODE_OUTPUT);

  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(PIN_PWM_MOTOR, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0);

  pinMode(PIN_LEVEL_SENSOR, INPUT_PULLUP);

  stopAll();
}

void stopAll() {
  s5PulseActive = false;
  digitalWrite(PIN_RELAY_S1, RELAY_OFF);
  digitalWrite(PIN_RELAY_S2, RELAY_OFF);
  digitalWrite(PIN_RELAY_S3, RELAY_OFF);
  digitalWrite(PIN_RELAY_S4, RELAY_OFF);
  digitalWrite(PIN_RELAY_S5, RELAY_OFF);
  stopMotor();
}

int readLevelSensor() {
  return digitalRead(PIN_LEVEL_SENSOR);
}

void connectWiFi() {
  Serial.println("\n[WIFI] Resetando interface de rede...");
  WiFi.disconnect(true);
  delay(100);
  delay(500); // Tempo maior para o chip de radio descarregar
  
  WiFi.mode(WIFI_STA);
  // Desabilita a economia de energia para forcar o sinal do Wi-Fi ao maximo
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  Serial.printf("[WIFI] MAC Address: %s\n", WiFi.macAddress().c_str());
  Serial.printf("[WIFI] Conectando a rede: %s ", WIFI_SSID);
  
  int attempts = 0;
  while ((WiFi.status() != WL_CONNECTED || WiFi.localIP().toString() == "0.0.0.0") && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED && WiFi.localIP().toString() != "0.0.0.0") {
    Serial.printf("\n[WIFI] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] FALHA! Verifique se a rede e 2.4GHz, senha correta ou falha de DHCP.");
  }
}

// ==============================================================================
// FUNÇÕES AUXILIARES DE ESTADO
// ==============================================================================
const char* getStatusString() {
  if (currentState == IDLE) return "idle";
  if (currentState == STOPPED) return "stopped";
  if (currentState == ERROR_STATE) return "error";
  return "running";
}

int getCurrentStepNum() {
  if (currentState >= STEP0_CHECK && currentState <= STEP7_DONE) {
    return (int)currentState;
  }
  return 0; // idle/stopped
}

const char* getCurrentStepName() {
  switch (currentState) {
    case STEP0_CHECK: return "Verificacao Inicial";
    case STEP1_LIQUID1: return "Entrada de liquido";
    case STEP2_POWDER: return "Adicao de po";
    case STEP4_MIX: return "Agitacao";
    case STEP5_EXTRACT: return "Retirada do produto agitado";
    case STEP6_SERVE: return "Servindo no copo";
    case STEP7_DONE: return "Finalizado";
    case STOPPED: return "Parado";
    case ERROR_STATE: return "Em Erro";
    default: return "Ocioso";
  }
}

// ==============================================================================
// CONTROLE DE RAMPA SUAVE DO MOTOR
// ==============================================================================

void startMotorRamp(uint8_t targetDuty) {
  motorRampTarget  = targetDuty;
  motorRampStart   = millis();
  motorRamping     = true;
  motorCurrentDuty = MOTOR_MIN_DUTY;
  ledcWrite(PWM_CHANNEL, MOTOR_MIN_DUTY);
}

void stopMotor() {
  motorRamping     = false;
  motorCurrentDuty = 0;
  ledcWrite(PWM_CHANNEL, 0);
}

void updateMotorRamp() {
  if (!motorRamping) return;

  // Se o alvo for menor ou igual ao minimo, aplica direto sem rampa
  if (motorRampTarget <= MOTOR_MIN_DUTY) {
    motorCurrentDuty = motorRampTarget;
    ledcWrite(PWM_CHANNEL, motorCurrentDuty);
    motorRamping = false;
    return;
  }

  unsigned long rampElapsed = millis() - motorRampStart;

  if (rampElapsed >= (unsigned long)MOTOR_RAMP_MS) {
    motorCurrentDuty = motorRampTarget;
    ledcWrite(PWM_CHANNEL, motorCurrentDuty);
    motorRamping = false;
    return;
  }

  // Interpolacao linear: MOTOR_MIN_DUTY -> motorRampTarget em MOTOR_RAMP_MS ms
  uint8_t duty = (uint8_t)(MOTOR_MIN_DUTY +
    (int)(motorRampTarget - MOTOR_MIN_DUTY) * (long)rampElapsed / MOTOR_RAMP_MS);

  if (duty != motorCurrentDuty) {
    motorCurrentDuty = duty;
    ledcWrite(PWM_CHANNEL, duty);
  }
}

void updateS5Pulse() {
  if (!s5PulseActive) return;
  // Desativa se o processo automatico assumir o controle
  if (currentState != IDLE && currentState != STOPPED && currentState != ERROR_STATE) {
    s5PulseActive = false;
    return;
  }
  unsigned long cycle = (millis() - s5PulseStart) % ((unsigned long)(s5PulseOnMs + s5PulseOffMs));
  digitalWrite(PIN_RELAY_S5, cycle < (unsigned long)s5PulseOnMs ? RELAY_ON : RELAY_OFF);
}
