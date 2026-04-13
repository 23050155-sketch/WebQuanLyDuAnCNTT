from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_project, crud_user, crud_project_member, crud_task
from ..schemas import project as schemas
from ..schemas import project_member as member_schemas
from ..schemas import task as task_schemas

router = APIRouter(prefix="/projects", tags=["Projects"])

# ==================== HÀM KIỂM TRA QUYỀN TRONG PROJECT ====================
def get_user_role_in_project(db: Session, project_id: str, user_id: int):
    """Lấy vai trò của user trong project cụ thể"""
    project = crud_project.get_project(db, project_id)
    if project and project.created_by == user_id:
        return 'creator'
    
    member = crud_project_member.get_project_member_by_project_and_user(db, project_id, user_id)
    return member.role_in_project if member else None


def can_edit_project(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có quyền chỉnh sửa project không (creator hoặc manager)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager']


def can_delete_project(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có quyền xóa project không (chỉ creator)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role == 'creator'


def can_manage_members(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có quyền quản lý thành viên không (creator hoặc manager)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager']


# ==================== QUYỀN CHO TASKS ====================
def can_view_tasks(db: Session, project_id: str, user_id: int):
    """Xem danh sách công việc (tất cả thành viên đều xem được)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role is not None


def can_create_task(db: Session, project_id: str, user_id: int):
    """Thêm công việc mới (creator, manager, developer)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager', 'developer']


def can_edit_task(db: Session, project_id: str, user_id: int):
    """Sửa công việc (creator, manager, developer)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager', 'developer']


def can_delete_task(db: Session, project_id: str, user_id: int):
    """Xóa công việc (creator, manager)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager']


def can_change_task_status(db: Session, project_id: str, user_id: int):
    """Đổi trạng thái công việc (creator, manager, developer, tester)"""
    role = get_user_role_in_project(db, project_id, user_id)
    return role in ['creator', 'manager', 'developer', 'tester']


# ==================== TASK ENDPOINTS TRONG PROJECT ====================
@router.get("/{project_id}/tasks", response_model=List[task_schemas.TaskResponse])
def get_project_tasks(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Lấy danh sách công việc của dự án (tất cả thành viên đều xem được)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not can_view_tasks(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="You don't have access to this project")
    
    tasks = crud_task.get_tasks_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return tasks


@router.post("/{project_id}/tasks", response_model=task_schemas.TaskResponse)
def create_project_task(
    project_id: str,
    task: task_schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Tạo công việc mới (creator, manager, developer)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not can_create_task(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="You don't have permission to create tasks")
    
    task.project_id = project_id
    task.created_by = current_user_id
    return crud_task.create_task(db=db, task=task)


@router.put("/{project_id}/tasks/{task_id}", response_model=task_schemas.TaskResponse)
def update_project_task(
    project_id: str,
    task_id: int,
    task: task_schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Cập nhật công việc (creator, manager, developer)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not can_edit_task(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="You don't have permission to edit tasks")
    
    db_task = crud_task.update_task(db, task_id=task_id, task_update=task)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


@router.patch("/{project_id}/tasks/{task_id}/status")
def update_task_status(
    project_id: str,
    task_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Cập nhật trạng thái công việc (creator, manager, developer, tester)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not can_change_task_status(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="You don't have permission to change task status")
    
    db_task = crud_task.update_task(db, task_id=task_id, task_update={"status": status})
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task status updated", "task": db_task}


@router.delete("/{project_id}/tasks/{task_id}")
def delete_project_task(
    project_id: str,
    task_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Xóa công việc (chỉ creator, manager)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not can_delete_task(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project creator or manager can delete tasks")
    
    success = crud_task.delete_task(db, task_id=task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


# ==================== PROJECT MEMBERS ENDPOINTS ====================
@router.get("/{project_id}/members", response_model=List[member_schemas.ProjectMemberDetailResponse])
def get_project_members(
    project_id: str, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    """Lấy danh sách thành viên (chỉ thành viên trong project mới xem được)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    role = get_user_role_in_project(db, project_id, current_user_id)
    if role is None:
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    
    members = crud_project_member.get_project_members_by_project(
        db, project_id=project_id, skip=skip, limit=limit
    )
    
    result = []
    for member in members:
        user = crud_user.get_user(db, user_id=member.user_id)
        result.append({
            "id": member.id,
            "project_id": member.project_id,
            "user_id": member.user_id,
            "role_in_project": member.role_in_project,
            "joined_at": member.joined_at,
            "username": user.username if user else None,
            "fullname": user.fullname if user else None,
            "email": user.email if user else None
        })
    
    return result


# ==================== CÁC ENDPOINT CƠ BẢN ====================
@router.post("/", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """Tạo dự án mới"""
    db_project = crud_project.get_project(db, project_id=project.project_id)
    if db_project:
        raise HTTPException(status_code=400, detail="Project code already exists")
    
    db_user = crud_user.get_user(db, user_id=project.created_by)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_project = crud_project.create_project(db=db, project=project)
    
    # Tự thêm người tạo vào project với role manager
    crud_project_member.create_project_member(db, member_schemas.ProjectMemberCreate(
        project_id=project.project_id,
        user_id=project.created_by,
        role_in_project="manager"
    ))
    
    return new_project


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
def update_project(
    project_id: str, 
    project: schemas.ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    if not can_edit_project(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project creator or manager can edit this project")
    
    db_project = crud_project.update_project(db, project_id=project_id, project_update=project)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project


@router.delete("/{project_id}")
def delete_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user_id: int = 1
):
    if not can_delete_project(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project creator can delete this project")
    
    success = crud_project.delete_project(db, project_id=project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}