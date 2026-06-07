import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class StravaConnection(Base):
    """A user's link to their Strava account (one per user)."""

    __tablename__ = "strava_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Strava athlete id — used to map incoming webhook events (owner_id) back to a user.
    athlete_id = Column(BigInteger, nullable=False, index=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    # Absolute expiry of the access token (naive UTC, mirrors the rest of the app).
    expires_at = Column(DateTime, nullable=False)
    scope = Column(String, nullable=True)
    # Fallback bike for activities whose gear has no mapping.
    default_bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_backfill_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="strava_connection")
    default_bike = relationship("Bike", foreign_keys=[default_bike_id])
    mappings = relationship(
        "StravaGearMapping",
        back_populates="connection",
        cascade="all, delete-orphan",
    )
    imported_activities = relationship(
        "StravaImportedActivity",
        back_populates="connection",
        cascade="all, delete-orphan",
    )
