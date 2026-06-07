from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator, field_validator
from app.models.service_interval import IntervalType


class ServiceIntervalCreate(BaseModel):
    interval_type: IntervalType
    interval_days: int | None = None
    interval_km: int | None = None
    reminder_days_before: int = 14

    @model_validator(mode="after")
    def check_required_fields(self) -> "ServiceIntervalCreate":
        if self.interval_type in (IntervalType.time, IntervalType.both) and not self.interval_days:
            raise ValueError("interval_days is required for time-based intervals")
        if self.interval_type in (IntervalType.distance, IntervalType.both) and not self.interval_km:
            raise ValueError("interval_km is required for distance-based intervals")
        return self

    @field_validator("interval_days")
    @classmethod
    def days_positive(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("interval_days must be > 0")
        return v

    @field_validator("interval_km")
    @classmethod
    def km_positive(cls, v: int | None) -> int | None:
        if v is not None and v <= 0:
            raise ValueError("interval_km must be > 0")
        return v


class ServiceIntervalUpdate(BaseModel):
    interval_type: IntervalType | None = None
    interval_days: int | None = None
    interval_km: int | None = None
    reminder_days_before: int | None = None


class ServiceIntervalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    component_id: UUID
    interval_type: IntervalType
    interval_days: int | None
    interval_km: int | None
    reminder_days_before: int
