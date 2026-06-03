from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal

from app.mqtt.client import mqtt_client

router = APIRouter()

class ProcessCommand(BaseModel):
    command: Literal["start", "stop", "status"]

class ActuatorCommand(BaseModel):
    actuator: Literal["S1", "S2", "S3", "S4", "S5", "MOTOR"]
    state: Literal["ON", "OFF"]

class PwmCommand(BaseModel):
    speed: int = Field(default=100, ge=30, le=255, description="Duty cycle PWM (30-255). Mínimo 30 evita zona morta do BTS7960. Padrão firmware: 100 (~39%)")

class S5PulseCommand(BaseModel):
    on_ms: int  = Field(default=400, ge=50, le=5000,  description="Tempo ON do pulso S5 em ms (50-5000)")
    off_ms: int = Field(default=800, ge=50, le=10000, description="Tempo OFF entre pulsos S5 em ms (50-10000)")

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

@router.post("/pwm", status_code=status.HTTP_202_ACCEPTED)
async def control_pwm(cmd: PwmCommand):
    """
    Define a velocidade do motor de agitação via PWM (30-255).
    Publica em mixer/command/pwm. O firmware aplica constrain(speed, 0, 255).
    Padrão operacional: 100 (~39% duty cycle). Frequência: 17 kHz (BTS7960).
    """
    topic = "mixer/command/pwm"
    try:
        mqtt_client.publish(topic, cmd.model_dump_json())
        return {"message": f"PWM motor definido: {cmd.speed}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")

@router.post("/s5pulse", status_code=status.HTTP_202_ACCEPTED)
async def control_s5pulse(cmd: S5PulseCommand):
    """
    Configura os tempos de pulso do motor eixo sem fim (S5) em runtime.
    on_ms: tempo com relé ligado por pulso. off_ms: pausa entre pulsos.
    """
    topic = "mixer/command/s5pulse"
    try:
        mqtt_client.publish(topic, cmd.model_dump_json())
        return {"message": f"S5 pulse: ON={cmd.on_ms}ms OFF={cmd.off_ms}ms"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao publicar no MQTT: {str(e)}")