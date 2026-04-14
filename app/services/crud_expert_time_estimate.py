from sqlalchemy.orm import Session
from ..models import ExpertTimeEstimate
from ..schemas import expert_time_estimate as schemas
from datetime import datetime

def get_estimate(db: Session, estimate_id: int):
    return db.query(ExpertTimeEstimate).filter(ExpertTimeEstimate.estimate_id == estimate_id).first()

def get_estimates_by_project(db: Session, project_id: str, skip: int = 0, limit: int = 100):
    return db.query(ExpertTimeEstimate).filter(
        ExpertTimeEstimate.project_id == project_id
    ).offset(skip).limit(limit).all()

def get_estimates_by_task(db: Session, task_id: int, skip: int = 0, limit: int = 100):
    return db.query(ExpertTimeEstimate).filter(
        ExpertTimeEstimate.task_id == task_id
    ).offset(skip).limit(limit).all()

def get_estimates_by_expert(db: Session, expert_id: int, skip: int = 0, limit: int = 100):
    return db.query(ExpertTimeEstimate).filter(
        ExpertTimeEstimate.expert_id == expert_id
    ).offset(skip).limit(limit).all()

def get_all_estimates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ExpertTimeEstimate).offset(skip).limit(limit).all()

def create_estimate(db: Session, estimate: schemas.ExpertTimeEstimateCreate):
    if estimate.expected_days == 0:
        expected = (estimate.optimistic_days + 4 * estimate.most_likely_days + estimate.pessimistic_days) / 6
        estimate.expected_days = round(expected, 2)
    
    db_estimate = ExpertTimeEstimate(**estimate.model_dump())
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)
    return db_estimate

def update_estimate(db: Session, estimate_id: int, estimate_update: schemas.ExpertTimeEstimateUpdate):
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        update_data = estimate_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_estimate, key, value)
        
        if 'optimistic_days' in update_data or 'most_likely_days' in update_data or 'pessimistic_days' in update_data:
            expected = (db_estimate.optimistic_days + 4 * db_estimate.most_likely_days + db_estimate.pessimistic_days) / 6
            db_estimate.expected_days = round(expected, 2)
        
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

def reject_estimate(db: Session, estimate_id: int, approver_id: int):
    """Từ chối ước lượng"""
    db_estimate = get_estimate(db, estimate_id)
    if db_estimate:
        db_estimate.status = 'rejected'
        db_estimate.approved_by = approver_id
        db_estimate.approved_at = datetime.utcnow()
        db.commit()
        db.refresh(db_estimate)
    return db_estimate

