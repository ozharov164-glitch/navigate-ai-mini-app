"""Premium minimal v2: task archive, remove routes/gamification."""
from alembic import op
import sqlalchemy as sa

revision = "005_premium_minimal_v2"
down_revision = "004_premium_test_override"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("archived", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))

    # Удаляем устаревшие сущности
    op.drop_table("routes")
    for col in ("streak_count", "streak_last_date", "xp", "route_provider"):
        try:
            op.drop_column("users", col)
        except Exception:
            pass
    try:
        op.drop_table("user_places")
    except Exception:
        pass
    try:
        op.drop_table("user_templates")
    except Exception:
        pass


def downgrade() -> None:
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "archived")
