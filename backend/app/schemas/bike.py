from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.bike import BikeType


class BikeCreate(BaseModel):
    name: str
    type: BikeType
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    total_km: float = 0.0
    photo_url: str | None = None

    @field_validator("total_km")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("total_km must be >= 0")
        return v


class BikeUpdate(BaseModel):
    name: str | None = None
    type: BikeType | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    photo_url: str | None = None


class OdometerUpdate(BaseModel):
    total_km: float

    @field_validator("total_km")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("total_km must be >= 0")
        return v


class BikeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    type: BikeType
    brand: str | None
    model: str | None
    year: int | None
    total_km: float
    photo_url: str | None
    created_at: datetime
