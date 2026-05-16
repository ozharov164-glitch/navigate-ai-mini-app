"""user_templates

Revision ID: 003_templates
Revises: 002_gamification
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_templates"
down_revision: Union[str, None] = "002_gamification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("template_key", sa.String(30), nullable=True),
        sa.Column("icon", sa.String(20), server_default="sparkles", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_templates_user_id", "user_templates", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_templates_user_id", table_name="user_templates")
    op.drop_table("user_templates")
