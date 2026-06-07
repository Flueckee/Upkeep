import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MaintenanceComment(Base):
    __tablename__ = "maintenance_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_id = Column(UUID(as_uuid=True), ForeignKey("maintenance_logs.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)  # max 1 000 chars enforced in the schema
    # created_at is set server-side at insert and is never editable via the API.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    log = relationship("MaintenanceLog", back_populates="comments")
