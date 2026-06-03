from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RecipeBase(BaseModel):
    name: str
    liquid1_time:   int = Field(default=1000,  ge=100,   le=30000)
    powder_time:    int = Field(default=3000,  ge=100,   le=30000)
    pulse_on:       int = Field(default=400,   ge=50,    le=5000)
    pulse_off:      int = Field(default=800,   ge=50,    le=10000)
    liquid2_time:   int = Field(default=4000,  ge=100,   le=30000)
    pre_mix_delay:  int = Field(default=500,   ge=0,     le=5000)
    mix_time:       int = Field(default=20000, ge=1000,  le=120000)
    motor_speed:    int = Field(default=48,    ge=30,    le=255)
    post_mix_delay: int = Field(default=1000,  ge=0,     le=5000)
    extract_time:   int = Field(default=6000,  ge=500,   le=30000)
    valve_delay:    int = Field(default=300,   ge=0,     le=2000)
    serve_time:     int = Field(default=5000,  ge=500,   le=30000)

class RecipeCreate(RecipeBase):
    pass

class Recipe(RecipeBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class ContainerBase(BaseModel):
    name: str
    type: str
    capacity_max: float
    current_level: float

class Container(ContainerBase):
    id: str

    class Config:
        from_attributes = True

class MixCommand(BaseModel):
    recipe_id: Optional[int] = None

class SystemStatus(BaseModel):
    status: str
    progress: int
    is_online: bool
    level_sensor: int = 1
