"""add_auth_and_rbac

Revision ID: 0002_add_auth_and_rbac
Revises: 0001_initial_schema
Create Date: 2026-08-07 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_add_auth_and_rbac'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add hashed_password, role, is_active, refresh_token to users table
    op.add_column('users', sa.Column('hashed_password', sa.String(length=255), server_default='', nullable=False))
    op.add_column('users', sa.Column('role', sa.String(length=50), server_default='USER', nullable=False))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('refresh_token', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'refresh_token')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')
    op.drop_column('users', 'hashed_password')
