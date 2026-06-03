from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api import control
from app.core.config import settings
from app.database.database import engine, Base
from app.mqtt.client import mqtt_client
import threading
import contextlib

# Cria as tabelas no SQLite se não existirem
Base.metadata.create_all(bind=engine)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup MQTT
    print("Iniciando conexão MQTT...")
    try:
         # Tenta conectar. Em um ambiente real, lidaria com retry.
         mqtt_client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
         
         # Roda o loop do MQTT em uma thread separada para não bloquear o FastAPI
         mqtt_thread = threading.Thread(target=mqtt_client.loop_forever)
         mqtt_thread.daemon = True
         mqtt_thread.start()
    except Exception as e:
         print(f"Aviso: Não foi possível conectar ao broker MQTT no startup: {e}")
         print("Verifique o arquivo .env")
    
    yield
    # Teardown MQTT
    print("Desconectando MQTT...")
    mqtt_client.disconnect()


app = FastAPI(title="SIMA Backend API", lifespan=lifespan)

# Configuração de CORS
# ALLOWED_ORIGINS pode conter origens explícitas separadas por vírgula
# ou o valor especial "*" para aceitar qualquer origem (útil em dev/staging).
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
allow_all = origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_origin_regex=r"https://.*\.onrender\.com" if not allow_all else None,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra as rotas
app.include_router(api_router, prefix="/api")
app.include_router(control.router, prefix="/api/control", tags=["Controle Manual e Debug"])

@app.get("/")
def read_root():
    return {"message": "SIMA API is running. Acesse /docs para Swagger."}