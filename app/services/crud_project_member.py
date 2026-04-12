from sqlalchemy.orm import Session
from ..models import ProjectMember
from ..schemas import project_member as schemas

def get_project_member(db: Session, member_id: int):
    return db.query(ProjectMember).filter(ProjectMember.id == member_id).first()

def get_project_member_by_project_and_user(db: Session, project_id: str, user_id: int):
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

def get_project_members_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).offset(skip).limit(limit).all()

def get_projects_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id
    ).offset(skip).limit(limit).all()

def get_all_project_members(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ProjectMember).offset(skip).limit(limit).all()

def create_project_member(db: Session, member: schemas.ProjectMemberCreate):
    db_member = ProjectMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def update_project_member(db: Session, member_id: int, member_update: schemas.ProjectMemberUpdate):
    db_member = get_project_member(db, member_id)
    if db_member and member_update.role_in_project is not None:
        db_member.role_in_project = member_update.role_in_project
        db.commit()
        db.refresh(db_member)
    return db_member

def delete_project_member(db: Session, member_id: int):
    db_member = get_project_member(db, member_id)
    if db_member:
        db.delete(db_member)
        db.commit()
        return True
    return False

def delete_project_member_by_project_and_user(db: Session, project_id: str, user_id: int):
    db_member = get_project_member_by_project_and_user(db, project_id, user_id)
    if db_member:
        db.delete(db_member)
        db.commit()
        return True
    return False