from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MaintenancePhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    log_id: UUID
    file_url: str
    thumbnail_url: str
    uploaded_at: datetime
    caption: str | None
