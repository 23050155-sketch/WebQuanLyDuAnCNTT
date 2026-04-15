from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_task_schedule, crud_task, crud_project, crud_user
from ..schemas import task_schedule as schemas

router = APIRouter(prefix="/task-schedule", tags=["Task Schedule"])

@router.post("/", response_model=schemas.TaskScheduleResponse)
def create_task_schedule(
    schedule: schemas.TaskScheduleCreate,
    db: Session = Depends(get_db)
):
    # Kiểm tra task tồn tại
    task = crud_task.get_task(db, task_id=schedule.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Kiểm tra user tồn tại
    user = crud_user.get_user(db, user_id=schedule.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Kiểm tra project tồn tại (dùng project_id từ request)
    project = crud_project.get_project(db, project_id=schedule.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Tạo schedule (không lưu project_id)
    return crud_task_schedule.create_schedule(db=db, schedule=schedule)


@router.get("/", response_model=List[schemas.TaskScheduleResponse])
def get_task_schedules(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    task_id: Optional[int] = Query(None, description="Filter by task ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    if project_id:
        schedules = crud_task_schedule.get_schedules_by_project(db, project_id=project_id, skip=skip, limit=limit)
    elif task_id:
        schedules = crud_task_schedule.get_schedules_by_task(db, task_id=task_id, skip=skip, limit=limit)
    elif user_id:
        schedules = crud_task_schedule.get_schedules_by_user(db, user_id=user_id, skip=skip, limit=limit)
    else:
        schedules = []
    return schedules


@router.get("/{schedule_id}", response_model=schemas.TaskScheduleResponse)
def get_task_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = crud_task_schedule.get_schedule(db, schedule_id=schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=schemas.TaskScheduleResponse)
def update_task_schedule(
    schedule_id: int,
    schedule: schemas.TaskScheduleUpdate,
    db: Session = Depends(get_db)
):
    db_schedule = crud_task_schedule.update_schedule(db, schedule_id=schedule_id, schedule_update=schedule)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return db_schedule


@router.delete("/{schedule_id}")
def delete_task_schedule(schedule_id: int, db: Session = Depends(get_db)):
    success = crud_task_schedule.delete_schedule(db, schedule_id=schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}