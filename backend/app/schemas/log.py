from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator


def _today_utc() -> date:
    return datetime.now(tz=timezone.utc).date()


class MaintenanceLogCreate(BaseModel):
    """
    Creates a maintenance log entry.

    **Immutability rules:**
    - Once created, a log entry cannot be updated or deleted.
    - `recorded_at` is set server-side and is never accepted as input.
    - `performed_at` must be between today − 7 days and today (UTC). Future
      dates and entries older than 7 days are rejected with HTTP 422.
    """

    performed_at: date
    odometer_km: float
    description: str
    cost: float | None = None

    @field_validator("performed_at")
    @classmethod
    def performed_at_in_window(cls, v: date) -> date:
        today = _today_utc()
        earliest = today - timedelta(days=7)
        if v > today:
            raise ValueError("performed_at cannot be in the future")
        if v < earliest:
            raise ValueError("performed_at cannot be more than 7 days in the past")
        return v

    @field_validator("odometer_km")
    @classmethod
    def odometer_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("odometer_km must be >= 0")
        return v

    @field_validator("cost")
    @classmethod
    def cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("cost must be >= 0")
        return v


class MaintenanceLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    component_id: UUID
    performed_at: date
    recorded_at: datetime
    odometer_km: float
    description: str
    cost: float | None
    created_at: datetime
