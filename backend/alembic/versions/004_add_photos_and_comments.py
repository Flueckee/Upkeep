"""add maintenance_photos and maintenance_comments tables

Revision ID: 004
Revises: 003
Create Date: 2026-05-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maintenance_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "log_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("maintenance_logs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("thumbnail_path", sa.String(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("caption", sa.String()),
    )
    op.create_index("ix_maintenance_photos_log_id", "maintenance_photos", ["log_id"])

    op.create_table(
        "maintenance_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "log_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("maintenance_logs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_maintenance_comments_log_id", "maintenance_comments", ["log_id"])


def downgrade() -> None:
    op.drop_index("ix_maintenance_comments_log_id", table_name="maintenance_comments")
    op.drop_table("maintenance_comments")

    op.drop_index("ix_maintenance_photos_log_id", table_name="maintenance_photos")
    op.drop_table("maintenance_photos")
