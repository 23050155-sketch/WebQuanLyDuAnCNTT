from sqlalchemy.orm import Session
from ..models import Task
from ..schemas import task as schemas

def get_task(db: Session, task_id: int):
    return db.query(Task).filter(Task.task_id == task_id).first()

def get_tasks_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(Task).filter(Task.project_id == project_id).offset(skip).limit(limit).all()

def get_tasks_by_assignee(db: Session, assignee_id: int, skip: int = 0, limit: int = 100):
    return db.query(Task).filter(Task.assignee_id == assignee_id).offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate):
    db_task = get_task(db, task_id)
    if db_task:
        update_data = task_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False