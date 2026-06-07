from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 10080  # 7 days

    # ── Strava integration ────────────────────────────────────────────────────
    # All optional so the app still boots without Strava configured.
    strava_client_id: str | None = None
    strava_client_secret: str | None = None
    strava_webhook_verify_token: str | None = None
    # Public HTTPS base URL of THIS backend, used for the OAuth callback and the
    # webhook callback (e.g. https://api.upkeep.example.com). No trailing slash.
    public_base_url: str | None = None
    # Deep link the mobile app listens on; the OAuth callback redirects here.
    app_deep_link: str = "upkeep://strava-connected"
    # How many days of history to import once when a user connects.
    strava_backfill_days: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
