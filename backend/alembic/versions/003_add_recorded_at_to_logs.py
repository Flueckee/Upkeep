"""add recorded_at to maintenance_logs, drop photo_url

Revision ID: 003
Revises: 002
Create Date: 2026-05-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add recorded_at; back-fill existing rows with their created_at value.
    op.add_column(
        "maintenance_logs",
        sa.Column("recorded_at", sa.DateTime(), nullable=True),
    )
    op.execute("UPDATE maintenance_logs SET recorded_at = created_at")
    op.alter_column("maintenance_logs", "recorded_at", nullable=False)

    # photo_url is superseded by the maintenance_photos table (added in 004).
    op.drop_column("maintenance_logs", "photo_url")


def downgrade() -> None:
    op.add_column(
        "maintenance_logs",
        sa.Column("photo_url", sa.String(), nullable=True),
    )
    op.drop_column("maintenance_logs", "recorded_at")
