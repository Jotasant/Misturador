import paho.mqtt.client as mqtt
import json
import asyncio
from app.core.config import settings
from app.websocket.manager import manager

# Variável de estado global (simples)
system_state = {
    "status": "idle",
    "progress": 0,
    "is_online": False,
    "level_sensor": 1  # 1 = reservatório vazio/ok, 0 = cheio
}

def on_connect(client, userdata, flags, rc):
    print(f"MQTT Conectado com código de resultado: {rc}")
    if rc == 0:
        # Se inscreve nos tópicos publicados pelo ESP32
        client.subscribe("mixer/status")
        client.subscribe("mixer/event")
        system_state["is_online"] = True
    else:
        print("Falha na conexão MQTT")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode('utf-8'))
        print(f"Mensagem recebida [{topic}]: {payload}")

        if topic == "mixer/status":
            system_state["status"] = payload.get("status", "idle")
            system_state["progress"] = payload.get("step", 0)
            system_state["level_sensor"] = payload.get("level_sensor", 1)
            system_state["is_online"] = True
            
            # Envia via WebSocket para os clientes conectados
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(manager.broadcast({
                    "type": "STATUS_UPDATE",
                    "data": system_state
                }))
            except RuntimeError:
                pass # Caso não consiga pegar o loop (na inicialização)

    except Exception as e:
        print(f"Erro processando msg MQTT: {e}")

def get_mqtt_client():
    client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Se estiver usando HiveMQ Cloud, geralmente usa TLS
    if settings.MQTT_PORT == 8883:
        client.tls_set() # Habilita SSL/TLS básico
        if settings.MQTT_USER and settings.MQTT_PASSWORD:
            client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)
            
    return client

mqtt_client = get_mqtt_client()