from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..services import crud_project_member, crud_project, crud_user
from ..schemas import project_member as schemas

router = APIRouter(prefix="/project-members", tags=["Project Members"])

@router.post("/", response_model=schemas.ProjectMemberResponse)
def add_project_member(member: schemas.ProjectMemberCreate, db: Session = Depends(get_db)):
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

@router.get("/", response_model=List[schemas.ProjectMemberResponse])
def read_all_project_members(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    members = crud_project_member.get_all_project_members(db, skip=skip, limit=limit)
    return members

@router.get("/project/{project_id}", response_model=List[schemas.ProjectMemberResponse])
def get_project_members(project_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    db_project = crud_project.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    members = crud_project_member.get_project_members_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return members

@router.get("/user/{user_id}", response_model=List[schemas.ProjectMemberResponse])
def get_user_projects(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    db_user = crud_user.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    projects = crud_project_member.get_projects_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return projects

@router.get("/{member_id}", response_model=schemas.ProjectMemberResponse)
def read_project_member(member_id: int, db: Session = Depends(get_db)):
    db_member = crud_project_member.get_project_member(db, member_id=member_id)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    return db_member

@router.put("/{member_id}", response_model=schemas.ProjectMemberResponse)
def update_project_member(member_id: int, member_update: schemas.ProjectMemberUpdate, db: Session = Depends(get_db)):
    db_member = crud_project_member.update_project_member(db, member_id=member_id, member_update=member_update)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    return db_member

@router.delete("/{member_id}")
def remove_project_member(member_id: int, db: Session = Depends(get_db)):
    success = crud_project_member.delete_project_member(db, member_id=member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project member not found")
    return {"message": "Member removed from project successfully"}

@router.delete("/project/{project_id}/user/{user_id}")
def remove_member_by_project_and_user(project_id: str, user_id: int, db: Session = Depends(get_db)):
    success = crud_project_member.delete_project_member_by_project_and_user(db, project_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found in project")
    return {"message": "Member removed from project successfully"}