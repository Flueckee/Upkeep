"""add avatar_url and primary_color to users

Revision ID: 005
Revises: 004
Create Date: 2026-05-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("primary_color", sa.String(7), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "primary_color")
    op.drop_column("users", "avatar_url")
