import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class StravaImportedActivity(Base):
    """Ledger of imported Strava activities — the basis for idempotency.

    The unique ``(connection_id, activity_id)`` constraint guarantees an activity
    is never counted twice. ``applied_km`` records exactly how much was added to
    the bike so edits and deletes can be reversed precisely.
    """

    __tablename__ = "strava_imported_activities"
    __table_args__ = (
        UniqueConstraint("connection_id", "activity_id", name="uq_activity_per_connection"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("strava_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_id = Column(BigInteger, nullable=False)
    bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="SET NULL"),
        nullable=True,
    )
    applied_km = Column(Float, nullable=False, default=0.0)
    gear_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    connection = relationship("StravaConnection", back_populates="imported_activities")
