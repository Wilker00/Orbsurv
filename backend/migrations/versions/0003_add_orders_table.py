"""Add orders table for purchase functionality

Revision ID: 0003_add_orders_table
Revises: 0002_add_performance_indexes
Create Date: 2024-01-15 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0003_add_orders_table"
down_revision = "0002_add_performance_indexes"
branch_labels = None
depends_on = None

order_status_enum = sa.Enum("pending", "completed", "cancelled", name="order_status")


def upgrade() -> None:
    order_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "order",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("plan_type", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", order_status_enum, nullable=False, server_default="pending"),
        sa.Column("registration_token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_order_email", "order", ["email"])
    op.create_index("ix_order_registration_token", "order", ["registration_token"], unique=True)
    op.create_index("ix_order_user_id", "order", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_order_user_id", table_name="order")
    op.drop_index("ix_order_registration_token", table_name="order")
    op.drop_index("ix_order_email", table_name="order")
    op.drop_table("order")
    order_status_enum.drop(op.get_bind(), checkfirst=True)

