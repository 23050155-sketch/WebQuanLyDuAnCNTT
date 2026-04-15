from sqlalchemy.orm import Session
from ..models import TaskSchedule, Task
from ..schemas import task_schedule as schemas
from datetime import datetime

def get_schedule(db: Session, schedule_id: int):
    return db.query(TaskSchedule).filter(TaskSchedule.schedule_id == schedule_id).first()

def get_schedules_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(TaskSchedule).join(
        Task, TaskSchedule.task_id == Task.task_id
    ).filter(
        Task.project_id == project_id
    ).offset(skip).limit(limit).all()

def get_schedules_by_task(db: Session, task_id: int, skip: int = 0, limit: int = 100):
    return db.query(TaskSchedule).filter(
        TaskSchedule.task_id == task_id
    ).offset(skip).limit(limit).all()

def get_schedules_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(TaskSchedule).filter(
        TaskSchedule.user_id == user_id
    ).offset(skip).limit(limit).all()

def create_schedule(db: Session, schedule: schemas.TaskScheduleCreate):
    db_schedule = TaskSchedule(
        task_id=schedule.task_id,
        user_id=schedule.user_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        scheduled_hours=schedule.scheduled_hours,
        actual_hours=schedule.actual_hours,
        notes=schedule.notes
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def update_schedule(db: Session, schedule_id: int, schedule_update: schemas.TaskScheduleUpdate):
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