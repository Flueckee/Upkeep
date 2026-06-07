import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.bike import Bike
from app.models.component import PRESET_COMPONENTS, Component
from app.schemas.bike import BikeCreate


def create_bike_with_presets(db: Session, user_id: uuid.UUID, payload: BikeCreate) -> Bike:
    """Create a bike and immediately attach the 12 default preset components."""
    bike = Bike(user_id=user_id, **payload.model_dump())
    db.add(bike)
    db.flush()  # populate bike.id before creating components

    presets = [
        Component(
            bike_id=bike.id,
            name=name,
            category=category,
            is_preset=True,
            installed_at=date.today(),
            installed_km=payload.total_km,
        )
        for name, category in PRESET_COMPONENTS
    ]
    db.add_all(presets)
    db.commit()
    db.refresh(bike)
    return bike
