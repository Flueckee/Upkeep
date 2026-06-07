from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.component import ComponentCategory


class ComponentCreate(BaseModel):
    name: str
    category: ComponentCategory
    installed_at: date | None = None
    installed_km: float = 0.0
    notes: str | None = None
    purchase_url: str | None = None


class ComponentUpdate(BaseModel):
    name: str | None = None
    category: ComponentCategory | None = None
    installed_at: date | None = None
    installed_km: float | None = None
    notes: str | None = None
    purchase_url: str | None = None


class ComponentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bike_id: UUID
    name: str
    category: ComponentCategory
    is_preset: bool
    installed_at: date | None
    installed_km: float | None
    notes: str | None
    purchase_url: str | None
    service_interval: ServiceIntervalResponse | None = None


# Deferred import to avoid circular dependency at module load time
from app.schemas.interval import ServiceIntervalResponse  # noqa: E402

ComponentResponse.model_rebuild()
