"""Thin HTTP wrapper around the Strava REST API.

All functions are module-level so they can be mocked in tests. The rest of the
app (``strava_service``) imports this module and calls e.g.
``strava_client.get_activity(...)``.
"""
from __future__ import annotations

import httpx

from app.config import settings

OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token"
DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize"
AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
API_BASE = "https://www.strava.com/api/v3"

_TIMEOUT = 15.0


def exchange_code(code: str) -> dict:
    """Exchange an authorization code for tokens. Returns the Strava token payload."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            OAUTH_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired access token. Returns the new token payload."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            OAUTH_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()


def deauthorize(access_token: str) -> None:
    """Revoke the app's access for the athlete owning this token."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(DEAUTHORIZE_URL, data={"access_token": access_token})
        resp.raise_for_status()


def get_activity(access_token: str, activity_id: int) -> dict:
    """Fetch a single detailed activity (includes distance in meters + gear_id)."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(
            f"{API_BASE}/activities/{activity_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def get_athlete(access_token: str) -> dict:
    """Fetch the authenticated athlete (includes the ``bikes`` gear array)."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(
            f"{API_BASE}/athlete",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def list_activities(access_token: str, after: int, per_page: int = 100, page: int = 1) -> list[dict]:
    """List the athlete's activities after a given epoch timestamp."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(
            f"{API_BASE}/athlete/activities",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"after": after, "per_page": per_page, "page": page},
        )
        resp.raise_for_status()
        return resp.json()


def create_push_subscription(callback_url: str, verify_token: str) -> dict:
    """Create the app-wide webhook push subscription."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            f"{API_BASE}/push_subscriptions",
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "callback_url": callback_url,
                "verify_token": verify_token,
            },
        )
        resp.raise_for_status()
        return resp.json()
