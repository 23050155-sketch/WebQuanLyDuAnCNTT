from sqlalchemy.orm import Session
from ..models import Project
from ..schemas import project as schemas

def get_project(db: Session, project_id: str):
    return db.query(Project).filter(Project.project_id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Project).offset(skip).limit(limit).all()

def get_projects_by_creator(db: Session, created_by: int, skip: int = 0, limit: int = 100):
    return db.query(Project).filter(Project.created_by == created_by).offset(skip).limit(limit).all()

def get_projects_by_status(db: Session, status: str, skip: int = 0, limit: int = 100):
    return db.query(Project).filter(Project.status == status).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: str, project_update: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if db_project:
        update_data = project_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_project, key, value)
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: str):
    db_project = get_project(db, project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False