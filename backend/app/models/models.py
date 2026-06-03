from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database.database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)

    # Parâmetros do processo (ms, exceto motor_speed que é duty cycle 0-255)
    liquid1_time    = Column(Integer, default=1000)   # ms 1ª injeção
    powder_time     = Column(Integer, default=3000)   # ms eixo sem fim
    pulse_on        = Column(Integer, default=400)    # ms relé S5 ON
    pulse_off       = Column(Integer, default=800)    # ms relé S5 OFF
    liquid2_time    = Column(Integer, default=4000)   # ms 2ª injeção
    pre_mix_delay   = Column(Integer, default=500)    # ms pausa antes agitação
    mix_time        = Column(Integer, default=20000)  # ms agitação
    motor_speed     = Column(Integer, default=48)     # duty cycle PWM 0-255
    post_mix_delay  = Column(Integer, default=1000)   # ms pausa após agitação
    extract_time    = Column(Integer, default=6000)   # ms extração
    valve_delay     = Column(Integer, default=300)    # ms delay válvula
    serve_time      = Column(Integer, default=5000)   # ms serviço ao usuário

class Container(Base):
    __tablename__ = "containers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)
    capacity_max = Column(Float)
    current_level = Column(Float)

class ExecutionHistory(Base):
    __tablename__ = "execution_history"

    id = Column(Integer, primary_key=True, index=True)
    recipe_name = Column(String)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String)
    water_consumed = Column(Float)
    powder_consumed = Column(Float)
