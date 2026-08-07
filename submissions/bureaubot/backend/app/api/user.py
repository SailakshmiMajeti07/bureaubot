from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user
from app.crud import (
    create_document,
    create_reminder,
    get_application_by_id,
    get_user_chat_history,
    get_user_documents,
    get_user_reminders,
    update_user_profile,
)
from app.database import get_db
from app.models import User
from app.schemas import (
    ChatHistoryRead,
    DocumentRead,
    ReminderCreate,
    ReminderRead,
    UserDocumentCreate,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users/me", tags=["User Profile & Data"])


@router.get("", response_model=UserRead)
def get_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    return UserRead.model_validate(current_user)


@router.put("", response_model=UserRead)
def update_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserRead:
    updated = update_user_profile(db, current_user, request.model_dump(exclude_unset=True))
    return UserRead.model_validate(updated)


@router.get("/documents", response_model=list[DocumentRead])
def get_my_documents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    docs = get_user_documents(db, current_user.id)
    return [DocumentRead.model_validate(d) for d in docs]


@router.post("/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_my_document(
    request: UserDocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DocumentRead:
    if request.application_id:
        app_record = get_application_by_id(db, request.application_id)
        if not app_record or app_record.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found or unauthorized")
        app_id = app_record.id
    else:
        # Create or find a default application for general user documents
        from app.crud import create_application, get_user_applications, list_services
        user_apps = get_user_applications(db, current_user.id)
        if user_apps:
            app_id = user_apps[0].id
        else:
            services = list_services(db)
            service = services[0] if services else None
            if not service:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active service available")
            import uuid
            new_app = create_application(db, current_user.id, service, f"DOC-APP-{uuid.uuid4().hex[:8].upper()}")
            app_id = new_app.id

    doc = create_document(
        db=db,
        application_id=app_id,
        document_type=request.document_type,
        file_name=request.file_name,
        storage_key=request.storage_key,
    )
    return DocumentRead.model_validate(doc)


@router.get("/reminders", response_model=list[ReminderRead])
def get_my_reminders(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[ReminderRead]:
    reminders = get_user_reminders(db, current_user.id)
    return [ReminderRead.model_validate(r) for r in reminders]


@router.post("/reminders", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
def create_my_reminder(
    request: ReminderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReminderRead:
    reminder = create_reminder(
        db=db,
        user_id=current_user.id,
        message=request.message,
        scheduled_for=request.scheduled_for,
        application_id=request.application_id,
        channel=request.channel,
    )
    return ReminderRead.model_validate(reminder)


@router.get("/chat-history", response_model=list[ChatHistoryRead])
def get_my_chat_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[ChatHistoryRead]:
    history = get_user_chat_history(db, current_user.id)
    return [ChatHistoryRead.model_validate(h) for h in history]
