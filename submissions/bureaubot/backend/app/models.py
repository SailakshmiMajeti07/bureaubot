from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ==========================================
# 1. SQLAlchemy ORM Models
# ==========================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="USER")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list["Application"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chat_histories: Mapped[list["ChatHistory"]] = relationship(back_populates="user")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # Service Name
    category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)  # Category
    description: Mapped[str] = mapped_column(Text, nullable=False)  # Description
    eligibility_rules: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # Eligibility Rules
    required_documents: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # Required Documents
    official_portal_url: Mapped[str] = mapped_column(String(500), nullable=False)  # Official Portal URL
    processing_time: Mapped[str | None] = mapped_column(String(200), nullable=True)  # Processing Time
    fees: Mapped[str | None] = mapped_column(String(200), nullable=True)  # Fees
    state: Mapped[str] = mapped_column(String(100), default="All India", nullable=False)  # State
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    workflow: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list["Application"]] = relationship(back_populates="service")
    eligibility_logs: Mapped[list["EligibilityLog"]] = relationship(back_populates="service")
    rules: Mapped[list["EligibilityRule"]] = relationship(back_populates="service", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True, nullable=False)
    reference_number: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="applications")
    service: Mapped[Service] = relationship(back_populates="applications")
    documents: Mapped[list["Document"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="application")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_name: Mapped[str] = mapped_column(String(300), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped[Application] = relationship(back_populates="documents")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    application_id: Mapped[UUID | None] = mapped_column(ForeignKey("applications.id"), index=True, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(40), default="in_app", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="scheduled", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="reminders")
    application: Mapped[Application | None] = relationship(back_populates="reminders")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str] = mapped_column(String(100), nullable=False)
    response: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship(back_populates="chat_histories")


class EligibilityRule(Base):
    __tablename__ = "eligibility_rules"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(200), nullable=False)
    rule_description: Mapped[str] = mapped_column(Text, nullable=False)
    condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    service: Mapped[Service] = relationship(back_populates="rules")


class EligibilityLog(Base):
    __tablename__ = "eligibility_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True, nullable=False)
    request_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    response_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    outcome: Mapped[str] = mapped_column(String(60), default="needs_official_assessment", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    service: Mapped[Service] = relationship(back_populates="eligibility_logs")


# Alias EligibilityRules for model import compatibility
EligibilityRules = EligibilityRule


# ==========================================
# 2. Pydantic Models for API Messages
# ==========================================

class Source(BaseModel):
    title: str
    url: str
    official: bool = True


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2_000)
    jurisdiction: str = Field(default="India", min_length=2, max_length=120)
    user_id: UUID | None = None
    case_reference: str | None = None


class EligibilityRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2_000)
    service: str | None = Field(default=None, max_length=100)
    jurisdiction: str = Field(default="India", min_length=2, max_length=120)
    user_id: UUID | None = None


class DocumentsRequest(BaseModel):
    message: str = Field(default="Verify documents", max_length=2_000)
    service_code: str | None = Field(default=None, max_length=80)
    documents: list[dict[str, Any]] = Field(default_factory=list, max_length=25)
    user_id: UUID | None = None


class ServicesRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    jurisdiction: str = Field(default="India", min_length=2, max_length=120)


class ToolResult(BaseModel):
    tool: str
    status: str
    data: dict[str, Any] = Field(default_factory=dict)
    sources: list[Source] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    intent: str
    tool: str
    response: str
    next_steps: list[str]
    confidence: float
    escalation_required: bool
    result: ToolResult


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "BureauBot API"
    version: str = "1.0.0"
