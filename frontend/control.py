from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal

from app.mqtt.client import mqtt_client

router = APIRouter()

class ProcessCommand(BaseModel):
    command: Literal["start", "stop", "status"]

class ActuatorCommand(BaseModel):
    actuator: Literal["S1", "S2", "S3", "S4", "S5", "PWM"]
    state: Literal["ON", "OFF"]
    value: int | None = Field(default=200, description="Valor do Duty Cycle para o motor PWM (0-255)")

@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def control_process(cmd: ProcessCommand):
    """
    Controla o processo principal de mistura.
    """
    topic = f"mixer/command/{cmd.command}"
    try:
        mqtt_client.publish(topic, '{"cmd": "' + cmd.command + '"}')
        return {"message": f"Comando '{cmd.command}' enviado para o tópico '{topic}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")

@router.post("/actuator", status_code=status.HTTP_202_ACCEPTED)
async def control_actuator(cmd: ActuatorCommand):
    """
    Controla um atuador específico individualmente.
    """
    topic = "mixer/command/actuator"
    payload = cmd.model_dump_json()
    
    try:
        mqtt_client.publish(topic, payload)
        return {"message": f"Comando enviado: {cmd.actuator} -> {cmd.state}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")