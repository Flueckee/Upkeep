import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MaintenancePhoto(Base):
    __tablename__ = "maintenance_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_id = Column(UUID(as_uuid=True), ForeignKey("maintenance_logs.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=False)
    # uploaded_at is set server-side and is never editable via the API.
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    caption = Column(String)  # max 200 chars enforced in the schema

    log = relationship("MaintenanceLog", back_populates="photos")
