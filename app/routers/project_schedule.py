from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_project_schedule, crud_project, crud_user
from ..schemas import project_schedule as schemas

router = APIRouter(prefix="/project-schedule", tags=["Project Schedule"])

@router.post("/", response_model=schemas.ProjectScheduleResponse)
def create_milestone(
    milestone: schemas.ProjectScheduleCreate,
    db: Session = Depends(get_db)
):
    # Kiểm tra project tồn tại
    project = crud_project.get_project(db, project_id=milestone.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return crud_project_schedule.create_schedule(db=db, schedule=milestone)


@router.get("/", response_model=List[schemas.ProjectScheduleResponse])
def get_milestones(
    project_id: str = Query(..., description="Project ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Kiểm tra project tồn tại
    project = crud_project.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    milestones = crud_project_schedule.get_schedules_by_project(db, project_id=project_id, skip=skip, limit=limit)
    return milestones


@router.get("/{schedule_id}", response_model=schemas.ProjectScheduleResponse)
def get_milestone(schedule_id: int, db: Session = Depends(get_db)):
    milestone = crud_project_schedule.get_schedule(db, schedule_id=schedule_id)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone


@router.put("/{schedule_id}", response_model=schemas.ProjectScheduleResponse)
def update_milestone(
    schedule_id: int,
    milestone: schemas.ProjectScheduleUpdate,
    db: Session = Depends(get_db)
):
    db_milestone = crud_project_schedule.update_schedule(db, schedule_id=schedule_id, schedule_update=milestone)
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return db_milestone


@router.delete("/{schedule_id}")
def delete_milestone(schedule_id: int, db: Session = Depends(get_db)):
    success = crud_project_schedule.delete_schedule(db, schedule_id=schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"message": "Milestone deleted successfully"}