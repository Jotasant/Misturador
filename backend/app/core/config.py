from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sima_database.db"
    
    MQTT_BROKER: str = "broker.hivemq.com"
    MQTT_PORT: int = 8883
    MQTT_USER: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_CLIENT_ID: str = "sima_backend_client"
    
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()