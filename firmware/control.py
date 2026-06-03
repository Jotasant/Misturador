from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal

# Importe a instância do seu cliente MQTT.
# O caminho pode variar ligeiramente dependendo da sua estrutura.
from app.mqtt.client import mqtt_client

router = APIRouter()

class ProcessCommand(BaseModel):
    """Comandos para controlar o ciclo de processo completo."""
    command: Literal["start", "stop", "status"]

class ActuatorCommand(BaseModel):
    """Comandos para acionar atuadores individuais (modo debug/manual)."""
    actuator: Literal["S1", "S2", "S3", "S4", "S5", "PWM"]
    state: Literal["ON", "OFF"]
    value: int | None = Field(default=200, description="Valor do Duty Cycle para o motor PWM (0-255)")

@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def control_process(cmd: ProcessCommand):
    """
    Controla o processo principal de mistura.
    - `start`: Inicia o ciclo automático completo.
    - `stop`: Dispara uma parada de emergência.
    - `status`: Solicita o status atual do dispositivo.
    """
    topic = f"mixer/command/{cmd.command}"
    try:
        mqtt_client.publish(topic, "{}") # Payload pode ser vazio
        return {"message": f"Comando '{cmd.command}' enviado para o tópico '{topic}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")

@router.post("/actuator", status_code=status.HTTP_202_ACCEPTED)
async def control_actuator(cmd: ActuatorCommand):
    """
    Controla um atuador específico individualmente.
    Funciona apenas quando a máquina está em estado IDLE, STOPPED ou ERROR.
    """
    topic = "mixer/command/actuator"
    payload = cmd.model_dump_json()
    try:
        mqtt_client.publish(topic, payload)
        return {"message": f"Comando de atuador enviado para {cmd.actuator}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")