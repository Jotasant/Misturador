from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models import models
from app.schemas import schemas
from app.mqtt.client import mqtt_client, system_state
from app.websocket.manager import manager
import json

router = APIRouter()

# --- WEBSOCKET ENDPOINT ---
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Envia o estado atual assim que conecta
        await websocket.send_text(json.dumps({"type": "INITIAL_STATE", "data": system_state}))
        while True:
            # Mantém a conexão aberta esperando algo (ex: ping)
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- MIXER CONTROL ---
@router.post("/mixer/start")
def start_mixer(command: schemas.MixCommand, db: Session = Depends(get_db)):
    if system_state["status"] == "mixing":
        raise HTTPException(status_code=400, detail="Misturador já está em operação.")
    
    payload = {}
    
    if command.recipe_id:
        recipe = db.query(models.Recipe).filter(models.Recipe.id == command.recipe_id).first()
        if not recipe:
            raise HTTPException(status_code=404, detail="Receita não encontrada")
        payload = {
            "liquid1_time":   recipe.liquid1_time,
            "powder_time":    recipe.powder_time,
            "pulse_on":       recipe.pulse_on,
            "pulse_off":      recipe.pulse_off,
            "liquid2_time":   recipe.liquid2_time,
            "pre_mix_delay":  recipe.pre_mix_delay,
            "mix_time":       recipe.mix_time,
            "motor_speed":    recipe.motor_speed,
            "post_mix_delay": recipe.post_mix_delay,
            "extract_time":   recipe.extract_time,
            "valve_delay":    recipe.valve_delay,
            "serve_time":     recipe.serve_time,
        }
    else:
        payload = {}

    # Envia comando via MQTT com parâmetros da receita no payload
    mqtt_client.publish("mixer/command/start", json.dumps(payload), qos=1)
    
    return {"message": "Comando enviado com sucesso", "payload": payload}

@router.post("/mixer/stop")
def stop_mixer():
    mqtt_client.publish("sima/cmd/mixer/stop", json.dumps({"command": "stop"}), qos=2)
    return {"message": "Comando de parada de emergência enviado"}

@router.get("/mixer/status", response_model=schemas.SystemStatus)
def get_mixer_status():
    return system_state

# --- RECIPES ---
@router.get("/recipes", response_model=list[schemas.Recipe])
def get_recipes(db: Session = Depends(get_db)):
    return db.query(models.Recipe).filter(models.Recipe.is_active == True).all()

@router.post("/recipes", response_model=schemas.Recipe, status_code=201)
def create_recipe(recipe: schemas.RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = models.Recipe(**recipe.model_dump())
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@router.put("/recipes/{recipe_id}", response_model=schemas.Recipe)
def update_recipe(recipe_id: int, recipe: schemas.RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    for key, value in recipe.model_dump().items():
        setattr(db_recipe, key, value)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@router.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    db.delete(db_recipe)
    db.commit()

# --- CONTAINERS ---
@router.get("/containers", response_model=list[schemas.Container])
def get_containers(db: Session = Depends(get_db)):
    return db.query(models.Container).all()

# --- INIT DEFAULT DATA (apenas para ambiente de dev) ---
@router.post("/system/init-db")
def init_db(db: Session = Depends(get_db)):
    # Criar recipientes default se não existir
    if not db.query(models.Container).first():
        db.add(models.Container(id="water", name="Tanque de Água", type="liquid", capacity_max=10000, current_level=8000))
        db.add(models.Container(id="powder", name="Silo de Pó", type="solid", capacity_max=25000, current_level=15000))
    
    # Receitas Default
    if not db.query(models.Recipe).first():
         db.add(models.Recipe(name="Argamassa ACIII", water_amount=800, powder_amount=2000, cycles=1, mix_time=45))
         db.add(models.Recipe(name="Mistura Padrão", water_amount=500, powder_amount=1000, cycles=1, mix_time=30))
         
    db.commit()
    return {"message": "Banco de dados inicializado com dados padrão."}