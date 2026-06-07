import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class BikeType(str, enum.Enum):
    road = "road"
    gravel = "gravel"
    mtb = "mtb"
    other = "other"


class Bike(Base):
    __tablename__ = "bikes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(BikeType, name="biketype", native_enum=False), nullable=False)
    brand = Column(String)
    model = Column(String)
    year = Column(Integer)
    total_km = Column(Float, default=0.0, nullable=False)
    photo_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="bikes")
    components = relationship("Component", back_populates="bike", cascade="all, delete-orphan")
