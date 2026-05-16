"""gamification + route_provider

Revision ID: 002_gamification
Revises: 001_initial
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_gamification"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("route_provider", sa.String(10), server_default="auto", nullable=False))
    op.add_column("users", sa.Column("streak_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("streak_last_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("xp", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "xp")
    op.drop_column("users", "streak_last_date")
    op.drop_column("users", "streak_count")
    op.drop_column("users", "route_provider")
