from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class MaintenanceCommentCreate(BaseModel):
    """
    Appends a comment to a maintenance log entry.

    **Immutability rules:**
    - Comments cannot be edited or deleted after creation.
    - `created_at` is set server-side and is never accepted as client input.
    """

    text: str

    @field_validator("text")
    @classmethod
    def text_not_empty_and_max_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text must not be empty")
        if len(v) > 1000:
            raise ValueError("text must be 1 000 characters or fewer")
        return v


class MaintenanceCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    log_id: UUID
    text: str
    created_at: datetime
