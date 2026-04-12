from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import CostEstimate
from ..schemas import cost_estimate as schemas
from datetime import datetime

def get_estimate(db: Session, estimate_id: int):
    return db.query(CostEstimate).filter(CostEstimate.estimate_id == estimate_id).first()

def get_estimates_by_task(db: Session, task_id: int, skip: int = 0, limit: int = 100):
    return db.query(CostEstimate).filter(
        CostEstimate.task_id == task_id
    ).offset(skip).limit(limit).all()

def get_estimates_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(CostEstimate).filter(
        CostEstimate.project_id == project_id
    ).offset(skip).limit(limit).all()

def get_all_estimates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(CostEstimate).offset(skip).limit(limit).all()

def create_estimate(db: Session, estimate: schemas.CostEstimateCreate):
    if estimate.total_cost == 0:
        total = (estimate.labor_cost + estimate.equipment_cost + 
                estimate.office_supplies_cost + estimate.training_cost + 
                estimate.travel_cost + estimate.other_cost)
        estimate.total_cost = total
    
    db_estimate = CostEstimate(**estimate.model_dump())
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)
    return db_estimate

def update_estimate(db: Session, estimate_id: int, estimate_update: schemas.CostEstimateUpdate):
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        update_data = estimate_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_estimate, key, value)
        
        cost_fields = ['labor_cost', 'equipment_cost', 'office_supplies_cost', 
                       'training_cost', 'travel_cost', 'other_cost']
        if any(field in update_data for field in cost_fields):
            total = (db_estimate.labor_cost + db_estimate.equipment_cost + 
                    db_estimate.office_supplies_cost + db_estimate.training_cost + 
                    db_estimate.travel_cost + db_estimate.other_cost)
            db_estimate.total_cost = total
        
        db.commit()
        db.refresh(db_estimate)
    return db_estimate

def delete_estimate(db: Session, estimate_id: int):
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        db.delete(db_estimate)
        db.commit()
        return True
    return False

def approve_estimate(db: Session, estimate_id: int, approver_id: int):
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        db_estimate.status = 'approved'
        db_estimate.approved_by = approver_id
        db_estimate.approved_at = datetime.utcnow()
        db.commit()
        db.refresh(db_estimate)
    return db_estimate

def get_summary(db: Session, project_id: str):
    result = db.query(
        func.sum(CostEstimate.labor_cost).label('total_labor'),
        func.sum(CostEstimate.equipment_cost).label('total_equipment'),
        func.sum(CostEstimate.office_supplies_cost).label('total_office_supplies'),
        func.sum(CostEstimate.training_cost).label('total_training'),
        func.sum(CostEstimate.travel_cost).label('total_travel'),
        func.sum(CostEstimate.other_cost).label('total_other'),
        func.sum(CostEstimate.total_cost).label('grand_total'),
        func.count(CostEstimate.estimate_id).label('total_estimates')
    ).filter(CostEstimate.project_id == project_id).first()
    
    return {
        "total_labor_cost": float(result.total_labor or 0),
        "total_equipment_cost": float(result.total_equipment or 0),
        "total_office_supplies_cost": float(result.total_office_supplies or 0),
        "total_training_cost": float(result.total_training or 0),
        "total_travel_cost": float(result.total_travel or 0),
        "total_other_cost": float(result.total_other or 0),
        "grand_total": float(result.grand_total or 0),
        "total_estimates": result.total_estimates or 0
    }