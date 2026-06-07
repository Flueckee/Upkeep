import uuid

from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class StravaGearMapping(Base):
    """Maps a Strava gear id (a bike registered on Strava) to an Upkeep bike.

    A row with ``bike_id = NULL`` means the gear is explicitly ignored (its
    kilometers are not imported). No row at all means the activity falls back to
    the connection's ``default_bike_id``.
    """

    __tablename__ = "strava_gear_mappings"
    __table_args__ = (UniqueConstraint("connection_id", "gear_id", name="uq_gear_per_connection"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("strava_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    gear_id = Column(String, nullable=False)
    bike_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bikes.id", ondelete="CASCADE"),
        nullable=True,
    )
    # Cached display name from Strava for the settings UI.
    gear_name = Column(String, nullable=True)

    connection = relationship("StravaConnection", back_populates="mappings")
    bike = relationship("Bike", foreign_keys=[bike_id])
