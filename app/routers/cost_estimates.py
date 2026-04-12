from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_cost_estimate, crud_task, crud_project, crud_user
from ..schemas import cost_estimate as schemas

router = APIRouter(prefix="/cost-estimates", tags=["Cost Estimates"])

@router.post("/", response_model=schemas.CostEstimateResponse)
def create_estimate(estimate: schemas.CostEstimateCreate, db: Session = Depends(get_db)):
    task = crud_task.get_task(db, task_id=estimate.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = crud_project.get_project(db, project_id=estimate.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    expert = crud_user.get_user(db, user_id=estimate.expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return crud_cost_estimate.create_estimate(db=db, estimate=estimate)

@router.get("/", response_model=List[schemas.CostEstimateResponse])
def read_estimates(
    skip: int = 0,
    limit: int = 100,
    task_id: Optional[int] = Query(None, description="Filter by task ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db)
):
    if task_id:
        estimates = crud_cost_estimate.get_estimates_by_task(db, task_id=task_id, skip=skip, limit=limit)
    elif project_id:
        estimates = crud_cost_estimate.get_estimates_by_project(db, project_id=project_id, skip=skip, limit=limit)
    else:
        estimates = crud_cost_estimate.get_all_estimates(db, skip=skip, limit=limit)
    return estimates

@router.get("/{estimate_id}", response_model=schemas.CostEstimateResponse)
def read_estimate(estimate_id: int, db: Session = Depends(get_db)):
    db_estimate = crud_cost_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Cost estimate not found")
    return db_estimate

@router.put("/{estimate_id}", response_model=schemas.CostEstimateResponse)
def update_estimate(estimate_id: int, estimate: schemas.CostEstimateUpdate, db: Session = Depends(get_db)):
    db_estimate = crud_cost_estimate.update_estimate(db, estimate_id=estimate_id, estimate_update=estimate)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Cost estimate not found")
    return db_estimate

@router.delete("/{estimate_id}")
def delete_estimate(estimate_id: int, db: Session = Depends(get_db)):
    success = crud_cost_estimate.delete_estimate(db, estimate_id=estimate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cost estimate not found")
    return {"message": "Cost estimate deleted successfully"}

@router.patch("/{estimate_id}/approve")
def approve_estimate(estimate_id: int, approver_id: int, db: Session = Depends(get_db)):
    db_estimate = crud_cost_estimate.approve_estimate(db, estimate_id=estimate_id, approver_id=approver_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Cost estimate not found")
    return {"message": "Cost estimate approved successfully"}

@router.get("/summary/{project_id}")
def get_cost_summary(project_id: str, db: Session = Depends(get_db)):
    project = crud_project.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    summary = crud_cost_estimate.get_summary(db, project_id=project_id)
    return summary