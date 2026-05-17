"""premium_test_override для теста владельцем бота"""
from alembic import op
import sqlalchemy as sa

revision = "004_premium_test_override"
down_revision = "003_user_templates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("premium_test_override", sa.String(16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "premium_test_override")
