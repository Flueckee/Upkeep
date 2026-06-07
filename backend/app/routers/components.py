from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.bike import Bike
from app.models.component import Component
from app.models.user import User
from app.schemas.component import ComponentCreate, ComponentUpdate, ComponentResponse

router = APIRouter(tags=["components"])


def _get_bike(bike_id: UUID, current_user: User, db: Session) -> Bike:
    bike = db.get(Bike, bike_id)
    if not bike or bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")
    return bike


def _get_component(component_id: UUID, current_user: User, db: Session) -> Component:
    component = db.get(Component, component_id)
    if not component or component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")
    return component


@router.get("/api/bikes/{bike_id}/components", response_model=list[ComponentResponse])
def list_components(
    bike_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_bike(bike_id, current_user, db)
    return (
        db.query(Component)
        .filter(Component.bike_id == bike_id)
        .order_by(Component.is_preset.desc(), Component.name)
        .all()
    )


@router.post(
    "/api/bikes/{bike_id}/components",
    response_model=ComponentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_component(
    bike_id: UUID,
    payload: ComponentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_bike(bike_id, current_user, db)
    component = Component(bike_id=bike_id, is_preset=False, **payload.model_dump())
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


@router.put("/api/components/{component_id}", response_model=ComponentResponse)
def update_component(
    component_id: UUID,
    payload: ComponentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    component = _get_component(component_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(component, field, value)
    db.commit()
    db.refresh(component)
    return component


@router.delete("/api/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_component(
    component_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    component = _get_component(component_id, current_user, db)
    db.delete(component)
    db.commit()
