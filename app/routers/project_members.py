from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..services import crud_project_member, crud_project, crud_user
from ..schemas import project_member as schemas

router = APIRouter(prefix="/project-members", tags=["Project Members"])

# ==================== HÀM KIỂM TRA QUYỀN TRONG PROJECT ====================
def get_user_role_in_project(db: Session, project_id: str, user_id: int):
    """Lấy vai trò của user trong project cụ thể"""
    # Admin có toàn quyền (coi như manager)
    user = crud_user.get_user(db, user_id)
    if user and user.role == 'admin':
        return 'manager'
    
    # Chỉ kiểm tra trong bảng project_members
    member = crud_project_member.get_project_member_by_project_and_user(db, project_id, user_id)
    return member.role_in_project if member else None


def can_manage_members(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có quyền quản lý thành viên không (chỉ manager)"""
    # Admin có toàn quyền
    user = crud_user.get_user(db, user_id)
    if user and user.role == 'admin':
        return True
    
    # Chỉ kiểm tra role manager trong project_members
    member = crud_project_member.get_project_member_by_project_and_user(db, project_id, user_id)
    return member and member.role_in_project == 'manager'


# ==================== ENDPOINTS ====================
@router.post("/", response_model=schemas.ProjectMemberResponse)
def add_project_member(
    member: schemas.ProjectMemberCreate, 
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: Lấy từ token
):
    """Thêm thành viên vào dự án (chỉ manager)"""
    # Kiểm tra quyền
    if not can_manage_members(db, member.project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project manager can add members")
    
    # Kiểm tra project tồn tại
    db_project = crud_project.get_project(db, project_id=member.project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Kiểm tra user tồn tại
    db_user = crud_user.get_user(db, user_id=member.user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Kiểm tra đã tồn tại trong project chưa
    existing = crud_project_member.get_project_member_by_project_and_user(
        db, member.project_id, member.user_id
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already in project")
    
    return crud_project_member.create_project_member(db=db, member=member)


@router.get("/project/{project_id}", response_model=List[schemas.ProjectMemberResponse])
def get_project_members(
    project_id: str, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: Lấy từ token
):
    """Lấy danh sách thành viên của dự án (chỉ thành viên trong project)"""
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Kiểm tra user có trong project không
    role = get_user_role_in_project(db, project_id, current_user_id)
    if role is None:
        raise HTTPException(status_code=403, detail="You are not a member of this project")
    
    members = crud_project_member.get_project_members_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return members


@router.get("/user/{user_id}", response_model=List[schemas.ProjectMemberResponse])
def get_user_projects(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Lấy danh sách dự án của user"""
    db_user = crud_user.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    projects = crud_project_member.get_projects_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return projects


@router.put("/{member_id}", response_model=schemas.ProjectMemberResponse)
def update_project_member(
    member_id: int, 
    member_update: schemas.ProjectMemberUpdate, 
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: Lấy từ token
):
    """Cập nhật vai trò thành viên (chỉ manager)"""
    db_member = crud_project_member.get_project_member(db, member_id=member_id)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    
    # Kiểm tra quyền
    if not can_manage_members(db, db_member.project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project manager can update member roles")
    
    # Không thể đổi vai trò của chính mình
    if db_member.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    db_member = crud_project_member.update_project_member(db, member_id=member_id, member_update=member_update)
    return db_member


@router.delete("/{member_id}")
def remove_project_member(
    member_id: int, 
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: Lấy từ token
):
    """Xóa thành viên khỏi dự án (chỉ manager)"""
    db_member = crud_project_member.get_project_member(db, member_id=member_id)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    
    # Kiểm tra quyền
    if not can_manage_members(db, db_member.project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project manager can remove members")
    
    # Không thể xóa chính mình
    if db_member.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself from project")
    
    success = crud_project_member.delete_project_member(db, member_id=member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project member not found")
    return {"message": "Member removed from project successfully"}


@router.delete("/project/{project_id}/user/{user_id}")
def remove_member_by_project_and_user(
    project_id: str, 
    user_id: int, 
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: Lấy từ token
):
    """Xóa thành viên khỏi dự án (theo project_id và user_id)"""
    # Kiểm tra quyền
    if not can_manage_members(db, project_id, current_user_id):
        raise HTTPException(status_code=403, detail="Only project manager can remove members")
    
    # Không thể xóa chính mình
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself from project")
    
    success = crud_project_member.delete_project_member_by_project_and_user(db, project_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found in project")
    return {"message": "Member removed from project successfully"}