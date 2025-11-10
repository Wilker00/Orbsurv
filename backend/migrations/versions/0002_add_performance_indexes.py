"""Add performance indexes on frequently queried fields

Revision ID: 0002_add_performance_indexes
Revises: 0001_initial
Create Date: 2024-01-01 12:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_add_performance_indexes"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index on user.created_at for sorting user lists
    op.create_index("ix_user_created_at", "user", ["created_at"], unique=False)
    
    # Index on contact.created_at for sorting contact lists
    op.create_index("ix_contact_created_at", "contact", ["created_at"], unique=False)
    
    # Index on waitlist.created_at for sorting waitlist entries
    op.create_index("ix_waitlist_created_at", "waitlist", ["created_at"], unique=False)
    
    # Index on investorinterest.created_at for sorting investor interest entries
    op.create_index("ix_investorinterest_created_at", "investorinterest", ["created_at"], unique=False)
    
    # Index on pilotrequest.created_at for sorting pilot requests
    op.create_index("ix_pilotrequest_created_at", "pilotrequest", ["created_at"], unique=False)
    
    # Index on auditlog.created_at for sorting audit logs (most important for pagination)
    op.create_index("ix_auditlog_created_at", "auditlog", ["created_at"], unique=False)
    
    # Index on auditlog.action for filtering audit logs by action type
    op.create_index("ix_auditlog_action", "auditlog", ["action"], unique=False)
    
    # Composite index on auditlog for common query pattern: filter by action and sort by created_at
    op.create_index("ix_auditlog_action_created_at", "auditlog", ["action", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_auditlog_action_created_at", table_name="auditlog")
    op.drop_index("ix_auditlog_action", table_name="auditlog")
    op.drop_index("ix_auditlog_created_at", table_name="auditlog")
    op.drop_index("ix_pilotrequest_created_at", table_name="pilotrequest")
    op.drop_index("ix_investorinterest_created_at", table_name="investorinterest")
    op.drop_index("ix_waitlist_created_at", table_name="waitlist")
    op.drop_index("ix_contact_created_at", table_name="contact")
    op.drop_index("ix_user_created_at", table_name="user")

