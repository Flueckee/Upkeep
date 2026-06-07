"""Strava integration endpoints.

Authenticated (mobile app, JWT):
  GET    /api/integrations/strava/status        — connection status
  GET    /api/integrations/strava/authorize-url — start OAuth (returns Strava URL)
  GET    /api/integrations/strava/gear          — Strava bikes + current mapping
  PUT    /api/integrations/strava/mappings      — set gear→bike mappings + default
  DELETE /api/integrations/strava               — disconnect

Public, called by Strava (no JWT — verified by state / verify-token / owner_id):
  GET    /api/integrations/strava/callback      — OAuth redirect target
  GET    /api/integrations/strava/webhook       — subscription validation handshake
  POST   /api/integrations/strava/webhook       — activity / deauth events
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, get_db
from app.dependencies import get_current_user
from app.models.bike import Bike
from app.models.user import User
from app.schemas.strava import (
    AuthorizeUrlResponse,
    MappingUpdateRequest,
    StravaGearItem,
    StravaStatusResponse,
)
from app.services import strava_client, strava_service

router = APIRouter(prefix="/api/integrations/strava", tags=["strava"])


# ── Authenticated endpoints ──────────────────────────────────────────────────

@router.get("/status", response_model=StravaStatusResponse)
def get_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = strava_service.get_connection_by_user(db, current_user.id)
    if conn is None:
        return StravaStatusResponse(connected=False)
    return StravaStatusResponse(
        connected=True,
        athlete_id=conn.athlete_id,
        default_bike_id=conn.default_bike_id,
        last_backfill_at=conn.last_backfill_at,
    )


@router.get("/authorize-url", response_model=AuthorizeUrlResponse)
def get_authorize_url(current_user: User = Depends(get_current_user)):
    if not settings.strava_client_id or not settings.public_base_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Strava integration is not configured on the server.",
        )
    state = strava_service.create_oauth_state(current_user.id)
    return AuthorizeUrlResponse(authorize_url=strava_service.build_authorize_url(state))


@router.get("/gear", response_model=list[StravaGearItem])
def get_gear(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = strava_service.get_connection_by_user(db, current_user.id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strava not connected")
    return strava_service.list_gear(db, conn)


@router.put("/mappings", response_model=StravaStatusResponse)
def update_mappings(
    payload: MappingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = strava_service.get_connection_by_user(db, current_user.id)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strava not connected")

    # Validate every referenced bike belongs to the user.
    bike_ids = [m.bike_id for m in payload.mappings if m.bike_id]
    if payload.default_bike_id:
        bike_ids.append(payload.default_bike_id)
    for bike_id in bike_ids:
        bike = db.get(Bike, bike_id)
        if not bike or bike.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bike {bike_id} not found",
            )

    strava_service.replace_mappings(
        db,
        conn,
        [m.model_dump() for m in payload.mappings],
        payload.default_bike_id,
    )
    db.refresh(conn)
    return StravaStatusResponse(
        connected=True,
        athlete_id=conn.athlete_id,
        default_bike_id=conn.default_bike_id,
        last_backfill_at=conn.last_backfill_at,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = strava_service.get_connection_by_user(db, current_user.id)
    if conn is not None:
        strava_service.disconnect(db, conn)


# ── Public endpoints called by Strava ────────────────────────────────────────

@router.get("/callback")
def oauth_callback(
    background: BackgroundTasks,
    code: str | None = None,
    state: str | None = None,
    scope: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """OAuth redirect target. Exchanges the code, stores the connection, kicks off
    a backfill, then deep-links back into the mobile app."""
    deep_link = settings.app_deep_link
    if error or not code or not state:
        return RedirectResponse(url=f"{deep_link}?status=denied")

    try:
        user_id = strava_service.verify_oauth_state(state)
    except JWTError:
        return RedirectResponse(url=f"{deep_link}?status=error")

    try:
        token_payload = strava_client.exchange_code(code)
    except Exception:
        return RedirectResponse(url=f"{deep_link}?status=error")

    conn = strava_service.upsert_connection(db, user_id, token_payload, scope)
    background.add_task(_run_backfill, conn.id)
    return RedirectResponse(url=f"{deep_link}?status=connected")


@router.get("/webhook")
def webhook_validation(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    """Strava subscription validation handshake."""
    if hub_mode == "subscribe" and hub_verify_token == settings.strava_webhook_verify_token:
        return JSONResponse({"hub.challenge": hub_challenge})
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def webhook_event(request: Request, background: BackgroundTasks):
    """Receive an event and return 200 fast; process in the background (<2s rule)."""
    event = await request.json()
    background.add_task(_handle_webhook_event, event)
    return {"status": "ok"}


# ── Background workers (own DB session, since request session is closed) ───────

def _run_backfill(connection_id: UUID) -> None:
    db = SessionLocal()
    try:
        from app.models.strava_connection import StravaConnection

        conn = db.get(StravaConnection, connection_id)
        if conn is not None:
            strava_service.backfill_recent(db, conn)
    except Exception:
        db.rollback()
    finally:
        db.close()


def _handle_webhook_event(event: dict) -> None:
    db = SessionLocal()
    try:
        object_type = event.get("object_type")
        owner_id = event.get("owner_id")
        conn = strava_service.get_connection_by_athlete(db, owner_id) if owner_id else None
        if conn is None:
            return  # event for an unknown / disconnected athlete

        if object_type == "athlete":
            updates = event.get("updates") or {}
            if str(updates.get("authorized")).lower() == "false":
                db.delete(conn)
                db.commit()
            return

        if object_type == "activity":
            strava_service.process_activity_event(
                db, conn, int(event["object_id"]), event.get("aspect_type", "create")
            )
    except Exception:
        db.rollback()
    finally:
        db.close()
