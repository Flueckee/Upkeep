import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bikes = relationship("Bike", back_populates="user", cascade="all, delete-orphan")
    strava_connection = relationship(
        "StravaConnection",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
