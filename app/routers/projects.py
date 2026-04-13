from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_project, crud_user, crud_project_member
from ..schemas import project as schemas
from ..schemas import project_member as member_schemas

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud_project.get_project(db, project_id=project.project_id)
    if db_project:
        raise HTTPException(status_code=400, detail="Project code already exists")
    db_user = crud_user.get_user(db, user_id=project.created_by)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can create project")
    return crud_project.create_project(db=db, project=project)

@router.get("/", response_model=List[schemas.ProjectResponse])
def read_projects(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status"),
    created_by: Optional[int] = Query(None, description="Filter by creator"),
    db: Session = Depends(get_db)
):
    if status:
        projects = crud_project.get_projects_by_status(db, status=status, skip=skip, limit=limit)
    elif created_by:
        projects = crud_project.get_projects_by_creator(db, created_by=created_by, skip=skip, limit=limit)
    else:
        projects = crud_project.get_projects(db, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def read_project(project_id: str, db: Session = Depends(get_db)):
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: str, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud_project.update_project(db, project_id=project_id, project_update=project)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    success = crud_project.delete_project(db, project_id=project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# ==================== THÊM ENDPOINT NÀY ====================
@router.get("/{project_id}/members", response_model=List[member_schemas.ProjectMemberResponse])
def get_project_members(
    project_id: str, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách thành viên của dự án"""
    # Kiểm tra dự án tồn tại
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Lấy danh sách thành viên
    members = crud_project_member.get_project_members_by_project(
        db, project_id=project_id, skip=skip, limit=limit
    )
    return members