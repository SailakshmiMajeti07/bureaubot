from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    EmailStr = str  # Fallback to standard string if email-validator is missing

from app.models import (
    ChatRequest,
    ChatResponse,
    DocumentsRequest,
    EligibilityRequest,
    HealthResponse,
    ServicesRequest,
    Source,
    ToolResult,
)

# ==========================================
# Auth & User Schemas
# ==========================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str | None = Field(default=None, min_length=6)
    full_name: str | None = Field(default=None, max_length=200)
    role: str = "USER"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


# ==========================================
# Service Schemas
# ==========================================

class ServiceCreate(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=200)
    category: str = Field(default="General", max_length=100)
    description: str
    official_portal_url: str = Field(max_length=500)
    eligibility_rules: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    workflow: list[str] = Field(default_factory=list)
    processing_time: str | None = Field(default=None, max_length=200)
    fees: str | None = Field(default=None, max_length=200)
    state: str = Field(default="All India", max_length=100)
    status: str = Field(default="active", max_length=50)


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = None
    official_portal_url: str | None = Field(default=None, max_length=500)
    eligibility_rules: list[str] | None = None
    required_documents: list[str] | None = None
    workflow: list[str] | None = None
    processing_time: str | None = None
    fees: str | None = None
    state: str | None = None
    status: str | None = None
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    category: str
    description: str
    official_portal_url: str
    eligibility_rules: list[str]
    required_documents: list[str]
    workflow: list[str]
    processing_time: str | None
    fees: str | None
    state: str
    status: str


# ==========================================
# Eligibility Rule Schemas
# ==========================================

class EligibilityRuleCreate(BaseModel):
    service_id: int
    rule_name: str = Field(min_length=2, max_length=200)
    rule_description: str
    condition: str | None = None
    is_mandatory: bool = True


class EligibilityRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    service_id: int
    rule_name: str
    rule_description: str
    condition: str | None
    is_mandatory: bool
    created_at: datetime


# ==========================================
# Application & Document Schemas
# ==========================================

class ApplicationCreate(BaseModel):
    user_id: UUID | None = None
    service_code: str
    reference_number: str = Field(min_length=3, max_length=120)


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    service_id: int
    reference_number: str
    status: str
    created_at: datetime


class DocumentCreate(BaseModel):
    application_id: UUID
    document_type: str = Field(min_length=2, max_length=120)
    file_name: str = Field(min_length=1, max_length=300)
    storage_key: str | None = Field(default=None, max_length=500)


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    application_id: UUID
    document_type: str
    file_name: str
    storage_key: str | None
    verification_status: str
    created_at: datetime


class UserDocumentCreate(BaseModel):
    application_id: UUID | None = None
    document_type: str = Field(min_length=2, max_length=120)
    file_name: str = Field(min_length=1, max_length=300)
    storage_key: str | None = Field(default=None, max_length=500)


# ==========================================
# Reminder & Chat History Schemas
# ==========================================

class ReminderCreate(BaseModel):
    user_id: UUID | None = None
    message: str = Field(min_length=3, max_length=2_000)
    scheduled_for: datetime
    application_id: UUID | None = None
    channel: str = "in_app"


class ReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    application_id: UUID | None
    message: str
    scheduled_for: datetime
    channel: str
    status: str
    created_at: datetime


class ChatHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID | None
    message: str
    intent: str
    response: dict[str, Any]
    created_at: datetime


# ==========================================
# Admin Dashboard Schemas
# ==========================================

class AdminDashboardResponse(BaseModel):
    total_users: int
    total_applications: int
    total_services: int
    active_services: int
    applications_by_status: dict[str, int]
    recent_users: list[UserRead]
    recent_applications: list[ApplicationRead]


__all__ = [
    "ChatRequest",
    "ChatResponse",
    "DocumentsRequest",
    "EligibilityRequest",
    "HealthResponse",
    "ServicesRequest",
    "Source",
    "ToolResult",
    "RegisterRequest",
    "LoginRequest",
    "RefreshTokenRequest",
    "TokenResponse",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "ServiceCreate",
    "ServiceUpdate",
    "ServiceRead",
    "EligibilityRuleCreate",
    "EligibilityRuleRead",
    "ApplicationCreate",
    "ApplicationRead",
    "DocumentCreate",
    "DocumentRead",
    "UserDocumentCreate",
    "ReminderCreate",
    "ReminderRead",
    "ChatHistoryRead",
    "AdminDashboardResponse",
]
