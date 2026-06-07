"""One-off helper to create the app-wide Strava webhook push subscription.

A Strava app has exactly ONE subscription (not one per user). Run this once,
after deploying, with STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET /
STRAVA_WEBHOOK_VERIFY_TOKEN / PUBLIC_BASE_URL set in the backend .env.

Strava will immediately call back to GET {PUBLIC_BASE_URL}/api/integrations/strava/webhook
with the verify token to validate the endpoint, so the backend must be live and
publicly reachable before running this.

Usage:
    cd backend && python -m scripts.strava_webhook
"""
from app.config import settings
from app.services import strava_client


def main() -> None:
    missing = [
        name
        for name, value in {
            "STRAVA_CLIENT_ID": settings.strava_client_id,
            "STRAVA_CLIENT_SECRET": settings.strava_client_secret,
            "STRAVA_WEBHOOK_VERIFY_TOKEN": settings.strava_webhook_verify_token,
            "PUBLIC_BASE_URL": settings.public_base_url,
        }.items()
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing required settings: {', '.join(missing)}")

    callback_url = f"{settings.public_base_url}/api/integrations/strava/webhook"
    result = strava_client.create_push_subscription(
        callback_url=callback_url,
        verify_token=settings.strava_webhook_verify_token,
    )
    print(f"Subscription created: {result}")


if __name__ == "__main__":
    main()
