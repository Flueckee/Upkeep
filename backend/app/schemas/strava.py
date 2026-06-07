from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class StravaStatusResponse(BaseModel):
    connected: bool
    athlete_id: int | None = None
    default_bike_id: UUID | None = None
    last_backfill_at: datetime | None = None


class AuthorizeUrlResponse(BaseModel):
    authorize_url: str


class StravaGearItem(BaseModel):
    gear_id: str
    name: str
    distance_km: float
    bike_id: UUID | None = None
    ignored: bool = False


class MappingItem(BaseModel):
    gear_id: str
    bike_id: UUID | None = None
    ignore: bool = False


class MappingUpdateRequest(BaseModel):
    mappings: list[MappingItem] = []
    default_bike_id: UUID | None = None
