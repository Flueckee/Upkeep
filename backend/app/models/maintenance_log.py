import uuid
from datetime import datetime
from sqlalchemy import Column, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    performed_at = Column(Date, nullable=False)
    # recorded_at is set server-side at insert and is never editable via the API.
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    odometer_km = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    cost = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    component = relationship("Component", back_populates="maintenance_logs")
    photos = relationship("MaintenancePhoto", back_populates="log", cascade="all, delete-orphan")
    comments = relationship("MaintenanceComment", back_populates="log", cascade="all, delete-orphan")
