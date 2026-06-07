"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "bikes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("brand", sa.String()),
        sa.Column("model", sa.String()),
        sa.Column("year", sa.Integer()),
        sa.Column("total_km", sa.Float(), nullable=False, server_default="0"),
        sa.Column("photo_url", sa.String()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_bikes_user_id", "bikes", ["user_id"])

    op.create_table(
        "components",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bike_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bikes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("is_preset", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("installed_at", sa.Date()),
        sa.Column("installed_km", sa.Float()),
        sa.Column("notes", sa.Text()),
    )
    op.create_index("ix_components_bike_id", "components", ["bike_id"])

    op.create_table(
        "maintenance_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("component_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("components.id", ondelete="CASCADE"), nullable=False),
        sa.Column("performed_at", sa.Date(), nullable=False),
        sa.Column("odometer_km", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cost", sa.Float()),
        sa.Column("photo_url", sa.String()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_maintenance_logs_component_id", "maintenance_logs", ["component_id"])

    op.create_table(
        "service_intervals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("component_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("components.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("interval_type", sa.String(), nullable=False),
        sa.Column("interval_days", sa.Integer()),
        sa.Column("interval_km", sa.Integer()),
        sa.Column("reminder_days_before", sa.Integer(), nullable=False, server_default="14"),
    )


def downgrade() -> None:
    op.drop_table("service_intervals")

    op.drop_index("ix_maintenance_logs_component_id", table_name="maintenance_logs")
    op.drop_table("maintenance_logs")

    op.drop_index("ix_components_bike_id", table_name="components")
    op.drop_table("components")

    op.drop_index("ix_bikes_user_id", table_name="bikes")
    op.drop_table("bikes")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
