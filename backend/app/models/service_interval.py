import enum
import uuid
from sqlalchemy import Column, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class IntervalType(str, enum.Enum):
    time = "time"
    distance = "distance"
    both = "both"


class ServiceInterval(Base):
    __tablename__ = "service_intervals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(
        UUID(as_uuid=True), ForeignKey("components.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    interval_type = Column(Enum(IntervalType, name="intervaltype", native_enum=False), nullable=False)
    interval_days = Column(Integer)
    interval_km = Column(Integer)
    reminder_days_before = Column(Integer, default=14, nullable=False)

    component = relationship("Component", back_populates="service_interval")
