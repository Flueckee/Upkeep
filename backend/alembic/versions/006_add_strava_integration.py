"""add strava integration tables

Revision ID: 006
Revises: 005
Create Date: 2026-06-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "strava_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("athlete_id", sa.BigInteger(), nullable=False),
        sa.Column("access_token", sa.String(), nullable=False),
        sa.Column("refresh_token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("scope", sa.String(), nullable=True),
        sa.Column(
            "default_bike_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bikes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("last_backfill_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_strava_connections_athlete_id", "strava_connections", ["athlete_id"])

    op.create_table(
        "strava_gear_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "connection_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("strava_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("gear_id", sa.String(), nullable=False),
        sa.Column(
            "bike_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bikes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("gear_name", sa.String(), nullable=True),
        sa.UniqueConstraint("connection_id", "gear_id", name="uq_gear_per_connection"),
    )

    op.create_table(
        "strava_imported_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "connection_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("strava_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("activity_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "bike_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bikes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("applied_km", sa.Float(), nullable=False),
        sa.Column("gear_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("connection_id", "activity_id", name="uq_activity_per_connection"),
    )


def downgrade() -> None:
    op.drop_table("strava_imported_activities")
    op.drop_table("strava_gear_mappings")
    op.drop_index("ix_strava_connections_athlete_id", table_name="strava_connections")
    op.drop_table("strava_connections")
