import enum
import uuid

from sqlalchemy import Boolean, Column, Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ComponentCategory(str, enum.Enum):
    brakes = "brakes"
    drivetrain = "drivetrain"
    wheels = "wheels"
    suspension = "suspension"
    other = "other"


PRESET_COMPONENTS: list[tuple[str, ComponentCategory]] = [
    ("Bremsbeläge vorne", ComponentCategory.brakes),
    ("Bremsbeläge hinten", ComponentCategory.brakes),
    ("Bremsscheibe vorne", ComponentCategory.brakes),
    ("Bremsscheibe hinten", ComponentCategory.brakes),
    ("Kette", ComponentCategory.drivetrain),
    ("Ritzelpaket / Kassette", ComponentCategory.drivetrain),
    ("Schaltwerk", ComponentCategory.drivetrain),
    ("Innenlager", ComponentCategory.drivetrain),
    ("Reifen vorne", ComponentCategory.wheels),
    ("Reifen hinten", ComponentCategory.wheels),
    ("Bartape / Lenkerband", ComponentCategory.other),
    ("Pedale", ComponentCategory.other),
]


class Component(Base):
    __tablename__ = "components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bike_id = Column(UUID(as_uuid=True), ForeignKey("bikes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(Enum(ComponentCategory, name="componentcategory", native_enum=False), nullable=False)
    is_preset = Column(Boolean, default=False, nullable=False)
    installed_at = Column(Date)
    installed_km = Column(Float, default=0.0)
    notes = Column(Text)
    purchase_url = Column(String)

    bike = relationship("Bike", back_populates="components")
    maintenance_logs = relationship(
        "MaintenanceLog", back_populates="component", cascade="all, delete-orphan"
    )
    service_interval = relationship(
        "ServiceInterval", back_populates="component",
        uselist=False, cascade="all, delete-orphan"
    )
