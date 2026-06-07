import enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.component import ComponentCategory
from app.schemas.interval import ServiceIntervalResponse


class DueStatus(str, enum.Enum):
    needs_first_service = "needs_first_service"
    due_soon = "due_soon"
    overdue = "overdue"


# Ordering used for sorting the response (worst first)
DUE_STATUS_ORDER: dict[DueStatus, int] = {
    DueStatus.overdue: 0,
    DueStatus.due_soon: 1,
    DueStatus.needs_first_service: 2,
}


class ComponentDueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: ComponentCategory
    status: DueStatus

    # Time axis (None when no log exists yet)
    days_since_service: int | None
    days_until_due: int | None   # negative = already overdue by N days

    # Distance axis (None when no log exists yet or interval is time-only)
    km_since_service: float | None
    km_until_due: float | None   # negative = already overdue by N km

    service_interval: ServiceIntervalResponse
