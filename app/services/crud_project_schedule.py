from sqlalchemy.orm import Session
from ..models import ProjectSchedule
from ..schemas import project_schedule as schemas
from datetime import datetime

def get_schedule(db: Session, schedule_id: int):
    return db.query(ProjectSchedule).filter(ProjectSchedule.schedule_id == schedule_id).first()

def get_schedules_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(ProjectSchedule).filter(
        ProjectSchedule.project_id == project_id
    ).order_by(ProjectSchedule.milestone_date).offset(skip).limit(limit).all()

def create_schedule(db: Session, schedule: schemas.ProjectScheduleCreate):
    db_schedule = ProjectSchedule(**schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def update_schedule(db: Session, schedule_id: int, schedule_update: schemas.ProjectScheduleUpdate):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        update_data = schedule_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_schedule, key, value)
        db_schedule.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_schedule)
    return db_schedule

def delete_schedule(db: Session, schedule_id: int):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        db.delete(db_schedule)
        db.commit()
        return True
    return False