from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bike import Bike
from app.models.component import Component
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.services.pdf_service import generate_pdf

router = APIRouter(tags=["export"])


@router.get(
    "/api/bikes/{bike_id}/export/pdf",
    summary="Export maintenance history as PDF",
    description=(
        "Generates and streams a PDF maintenance protocol for the bike.\n\n"
        "- Only the bike owner can export.\n"
        "- Use the optional `component_ids` query parameter (comma-separated UUIDs) "
        "to export a subset of components.\n"
        "- The PDF cover page includes a note explaining that this is an "
        "append-only protocol."
    ),
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF file",
        }
    },
)
def export_pdf(
    bike_id: UUID,
    component_ids: str | None = Query(
        default=None,
        description="Comma-separated component UUIDs to include. Omit for all components.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bike = (
        db.query(Bike)
        .options(
            selectinload(Bike.components)
            .selectinload(Component.maintenance_logs)
            .selectinload(MaintenanceLog.photos),
            selectinload(Bike.components)
            .selectinload(Component.maintenance_logs)
            .selectinload(MaintenanceLog.comments),
            selectinload(Bike.components)
            .selectinload(Component.service_interval),
        )
        .filter(Bike.id == bike_id)
        .first()
    )
    if not bike or bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")

    id_list: list[str] | None = None
    if component_ids:
        id_list = [cid.strip() for cid in component_ids.split(",") if cid.strip()]

    try:
        pdf_bytes = generate_pdf(
            bike=bike,
            components=bike.components,
            owner_name=current_user.name,
            component_ids=id_list,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {exc}",
        )

    safe_name = bike.name.replace(" ", "_").replace("/", "-")
    filename = f"Upkeep_{safe_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
