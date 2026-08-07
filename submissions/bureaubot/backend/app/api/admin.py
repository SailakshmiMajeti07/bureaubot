from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin_user
from app.crud import (
    create_service,
    delete_service,
    get_admin_dashboard_stats,
    list_all_applications,
    list_all_services_admin,
    list_all_users,
    update_service,
)
from app.database import get_db
from app.models import User
from app.schemas import (
    AdminDashboardResponse,
    ApplicationRead,
    ServiceCreate,
    ServiceRead,
    ServiceUpdate,
    UserRead,
)

router = APIRouter(prefix="/admin", tags=["Admin Management"])


@router.get("/users", response_model=list[UserRead])
def admin_list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> list[UserRead]:
    users = list_all_users(db)
    return [UserRead.model_validate(u) for u in users]


@router.get("/applications", response_model=list[ApplicationRead])
def admin_list_applications(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> list[ApplicationRead]:
    apps = list_all_applications(db)
    return [ApplicationRead.model_validate(a) for a in apps]


@router.get("/services", response_model=list[ServiceRead])
def admin_list_services(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> list[ServiceRead]:
    services = list_all_services_admin(db)
    return [ServiceRead.model_validate(s) for s in services]


@router.post("/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def admin_create_service(
    request: ServiceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> ServiceRead:
    service = create_service(db, request.model_dump())
    return ServiceRead.model_validate(service)


@router.put("/services/{id}", response_model=ServiceRead)
def admin_update_service(
    id: int,
    request: ServiceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> ServiceRead:
    updated = update_service(db, id, request.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return ServiceRead.model_validate(updated)


@router.delete("/services/{id}")
def admin_delete_service(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> dict[str, str]:
    success = delete_service(db, id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return {"message": f"Service #{id} has been deactivated successfully"}


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> AdminDashboardResponse:
    stats = get_admin_dashboard_stats(db)
    return AdminDashboardResponse(
        total_users=stats["total_users"],
        total_applications=stats["total_applications"],
        total_services=stats["total_services"],
        active_services=stats["active_services"],
        applications_by_status=stats["applications_by_status"],
        recent_users=[UserRead.model_validate(u) for u in stats["recent_users"]],
        recent_applications=[ApplicationRead.model_validate(a) for a in stats["recent_applications"]],
    )
