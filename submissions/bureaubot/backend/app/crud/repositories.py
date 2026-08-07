from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import (
    Application,
    ChatHistory,
    Document,
    EligibilityLog,
    EligibilityRule,
    Reminder,
    Service,
    User,
)

# ==========================================
# User & Auth CRUD Operations
# ==========================================

def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.scalar(select(User).where(User.id == user_id))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email.ilike(email)))


def create_user(db: Session, email: str, full_name: str | None = None, role: str = "USER") -> User:
    user = User(email=email.lower(), full_name=full_name, role=role, hashed_password="")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_user_with_password(
    db: Session, email: str, password: str, full_name: str | None = None, role: str = "USER"
) -> User:
    hashed = hash_password(password)
    user = User(
        email=email.lower(),
        hashed_password=hashed,
        full_name=full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_refresh_token(db: Session, user_id: UUID, refresh_token: str | None) -> None:
    user = get_user_by_id(db, user_id)
    if user:
        user.refresh_token = refresh_token
        db.commit()


def update_user_profile(db: Session, user: User, update_data: dict[str, Any]) -> User:
    for key, value in update_data.items():
        if value is not None and hasattr(user, key):
            if key == "email":
                setattr(user, key, value.lower())
            else:
                setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def list_all_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc())))


# ==========================================
# Service CRUD Operations
# ==========================================

def get_service_by_code(db: Session, code: str) -> Service | None:
    return db.scalar(select(Service).where(Service.code == code, Service.is_active.is_(True)))


def get_service_by_id(db: Session, service_id: int) -> Service | None:
    return db.scalar(select(Service).where(Service.id == service_id))


def search_services(db: Session, query: str, state: str | None = None) -> list[Service]:
    terms = [t for t in query.lower().split() if len(t) > 2] or [query.lower()]
    conditions = []
    for term in terms:
        t_pattern = f"%{term}%"
        conditions.append(
            Service.name.ilike(t_pattern)
            | Service.description.ilike(t_pattern)
            | Service.code.ilike(t_pattern)
            | Service.category.ilike(t_pattern)
        )
    stmt = select(Service).where(Service.is_active.is_(True), *conditions)
    if state and state.lower() != "india":
        stmt = stmt.where((Service.state == "All India") | (Service.state.ilike(f"%{state}%")))
    stmt = stmt.order_by(Service.name)
    results = list(db.scalars(stmt))
    if not results:
        fallback_stmt = select(Service).where(Service.is_active.is_(True)).order_by(Service.name)
        results = list(db.scalars(fallback_stmt))
    return results


def list_services(db: Session) -> list[Service]:
    return list(db.scalars(select(Service).where(Service.is_active.is_(True)).order_by(Service.name)))


def list_all_services_admin(db: Session) -> list[Service]:
    return list(db.scalars(select(Service).order_by(Service.id)))


def create_service(db: Session, service_data: dict[str, Any]) -> Service:
    service = Service(**service_data)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def update_service(db: Session, service_id: int, update_data: dict[str, Any]) -> Service | None:
    service = get_service_by_id(db, service_id)
    if not service:
        return None
    for key, value in update_data.items():
        if value is not None and hasattr(service, key):
            setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


def delete_service(db: Session, service_id: int) -> bool:
    service = get_service_by_id(db, service_id)
    if not service:
        return False
    service.is_active = False
    service.status = "inactive"
    db.commit()
    return True


# ==========================================
# Application CRUD Operations
# ==========================================

def create_application(db: Session, user_id: UUID, service: Service, reference_number: str) -> Application:
    application = Application(user_id=user_id, service_id=service.id, reference_number=reference_number)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def get_application_by_id(db: Session, application_id: UUID) -> Application | None:
    return db.scalar(select(Application).where(Application.id == application_id))


def list_all_applications(db: Session) -> list[Application]:
    return list(db.scalars(select(Application).order_by(Application.created_at.desc())))


def get_user_applications(db: Session, user_id: UUID) -> list[Application]:
    return list(db.scalars(select(Application).where(Application.user_id == user_id).order_by(Application.created_at.desc())))


# ==========================================
# Document CRUD Operations
# ==========================================

def create_document(
    db: Session, application_id: UUID, document_type: str, file_name: str, storage_key: str | None = None
) -> Document:
    document = Document(
        application_id=application_id, document_type=document_type, file_name=file_name, storage_key=storage_key
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_documents_by_application(db: Session, application_id: UUID) -> list[Document]:
    return list(db.scalars(select(Document).where(Document.application_id == application_id)))


def get_user_documents(db: Session, user_id: UUID) -> list[Document]:
    stmt = (
        select(Document)
        .join(Application, Document.application_id == Application.id)
        .where(Application.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    return list(db.scalars(stmt))


# ==========================================
# Reminder CRUD Operations
# ==========================================

def create_reminder(
    db: Session,
    user_id: UUID,
    message: str,
    scheduled_for: datetime,
    application_id: UUID | None = None,
    channel: str = "in_app",
) -> Reminder:
    reminder = Reminder(
        user_id=user_id,
        application_id=application_id,
        message=message,
        scheduled_for=scheduled_for,
        channel=channel,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_reminders_by_user(db: Session, user_id: UUID) -> list[Reminder]:
    return list(db.scalars(select(Reminder).where(Reminder.user_id == user_id).order_by(Reminder.scheduled_for.desc())))


get_user_reminders = get_reminders_by_user


# ==========================================
# Chat History & Eligibility CRUD Operations
# ==========================================

def create_chat_history(db: Session, user_id: UUID | None, message: str, intent: str, response: dict) -> ChatHistory:
    history = ChatHistory(user_id=user_id, message=message, intent=intent, response=response)
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_chat_history_by_user(db: Session, user_id: UUID) -> list[ChatHistory]:
    return list(db.scalars(select(ChatHistory).where(ChatHistory.user_id == user_id).order_by(ChatHistory.created_at.desc())))


get_user_chat_history = get_chat_history_by_user


def create_eligibility_rule(
    db: Session,
    service_id: int,
    rule_name: str,
    rule_description: str,
    condition: str | None = None,
    is_mandatory: bool = True,
) -> EligibilityRule:
    rule = EligibilityRule(
        service_id=service_id,
        rule_name=rule_name,
        rule_description=rule_description,
        condition=condition,
        is_mandatory=is_mandatory,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def get_eligibility_rules_by_service(db: Session, service_id: int) -> list[EligibilityRule]:
    return list(db.scalars(select(EligibilityRule).where(EligibilityRule.service_id == service_id)))


def create_eligibility_log(
    db: Session, user_id: UUID | None, service: Service, request_data: dict, response_data: dict
) -> EligibilityLog:
    log = EligibilityLog(user_id=user_id, service_id=service.id, request_data=request_data, response_data=response_data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ==========================================
# Admin Dashboard Analytics
# ==========================================

def get_admin_dashboard_stats(db: Session) -> dict[str, Any]:
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_applications = db.scalar(select(func.count(Application.id))) or 0
    total_services = db.scalar(select(func.count(Service.id))) or 0
    active_services = db.scalar(select(func.count(Service.id)).where(Service.is_active.is_(True))) or 0

    status_counts = {}
    rows = db.execute(select(Application.status, func.count(Application.id)).group_by(Application.status)).all()
    for status_str, count in rows:
        status_counts[status_str] = count

    recent_users = list(db.scalars(select(User).order_by(User.created_at.desc()).limit(5)))
    recent_applications = list(db.scalars(select(Application).order_by(Application.created_at.desc()).limit(5)))

    return {
        "total_users": total_users,
        "total_applications": total_applications,
        "total_services": total_services,
        "active_services": active_services,
        "applications_by_status": status_counts,
        "recent_users": recent_users,
        "recent_applications": recent_applications,
    }
