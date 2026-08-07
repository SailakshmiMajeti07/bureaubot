from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.core.deps import get_optional_user
from app.crud import repositories as crud
from app.db.session import get_db
from app.graph import build_graph
from app.models import ChatRequest, ChatResponse, DocumentsRequest, EligibilityRequest, ServicesRequest, ToolResult, User
from app.schemas.api import ApplicationCreate, ApplicationRead, DocumentCreate, ReminderCreate, ServiceRead, UserCreate, UserRead

router = APIRouter()

# Include feature routers
router.include_router(auth_router)
router.include_router(admin_router)
router.include_router(user_router)

graph = build_graph()


def run_workflow(
    db: Session,
    request: ChatRequest,
    forced_tool: str | None = None,
    documents: list[dict] | None = None,
    service_code: str | None = None,
    current_user: User | None = None,
) -> ChatResponse:
    user_id = current_user.id if current_user else getattr(request, "user_id", None)
    state = graph.invoke({
        "db": db,
        "message": request.message,
        "jurisdiction": getattr(request, "jurisdiction", "India"),
        "user_id": user_id,
        "case_reference": getattr(request, "case_reference", None),
        "documents": documents or [],
        "service_code": service_code,
        "forced_tool": forced_tool,
    })
    result = ToolResult.model_validate(state["tool_result"])
    response = ChatResponse(
        intent=state["intent"],
        tool=state["selected_tool"],
        response=state["response"],
        next_steps=state["next_steps"],
        confidence=state["confidence"],
        escalation_required=state["escalation_required"],
        result=result,
    )
    crud.create_chat_history(db, user_id, request.message, response.intent, response.model_dump(mode="json"))
    return response


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    return run_workflow(db, request, current_user=current_user)


@router.post("/eligibility", response_model=ChatResponse)
def eligibility(
    request: EligibilityRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    message = request.message if not request.service else f"{request.service}: {request.message}"
    user_id = current_user.id if current_user else request.user_id
    response = run_workflow(db, request.model_copy(update={"message": message}), current_user=current_user)
    service = crud.get_service_by_code(db, response.tool)
    if service:
        crud.create_eligibility_log(
            db, user_id, service, request.model_dump(mode="json"), response.model_dump(mode="json")
        )
    return response


@router.post("/documents", response_model=ChatResponse)
def documents(
    request: DocumentsRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    return run_workflow(
        db,
        request,
        forced_tool="document_verification",
        documents=request.documents,
        service_code=request.service_code,
        current_user=current_user,
    )


@router.post("/services", response_model=ChatResponse)
def services(
    request: ServicesRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    return run_workflow(
        db,
        ChatRequest(message=request.query, jurisdiction=request.jurisdiction),
        forced_tool="portal_finder",
        current_user=current_user,
    )


@router.get("/services", response_model=list[ServiceRead])
def list_services(db: Session = Depends(get_db)) -> list[ServiceRead]:
    return crud.list_services(db)


@router.get("/services/{service_code}", response_model=ServiceRead)
def get_service(service_code: str, db: Session = Depends(get_db)) -> ServiceRead:
    service = crud.get_service_by_code(db, service_code)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(request: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    try:
        return crud.create_user(db, request.email, request.full_name)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists")


@router.post("/applications", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(request: ApplicationCreate, db: Session = Depends(get_db)) -> ApplicationRead:
    service = crud.get_service_by_code(db, request.service_code)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    try:
        return crud.create_application(db, request.user_id, service, request.reference_number)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User or reference number is invalid or already exists")


@router.post("/application-documents", status_code=status.HTTP_201_CREATED)
def create_document(request: DocumentCreate, db: Session = Depends(get_db)) -> dict:
    try:
        document = crud.create_document(
            db, request.application_id, request.document_type, request.file_name, request.storage_key
        )
        return {"id": str(document.id), "verification_status": document.verification_status}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=404, detail="Application not found")


@router.post("/reminders", status_code=status.HTTP_201_CREATED)
def create_reminder(request: ReminderCreate, db: Session = Depends(get_db)) -> dict:
    try:
        reminder = crud.create_reminder(
            db, request.user_id, request.message, request.scheduled_for, request.application_id, request.channel
        )
        return {"id": str(reminder.id), "status": reminder.status, "scheduled_for": reminder.scheduled_for}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=404, detail="User or application not found")
