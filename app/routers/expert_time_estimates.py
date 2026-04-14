from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services import crud_expert_time_estimate, crud_task, crud_project, crud_user, crud_project_member
from ..schemas import expert_time_estimate as schemas

router = APIRouter(prefix="/expert-time-estimates", tags=["Expert Time Estimates"])

# ==================== HÀM KIỂM TRA QUYỀN ====================
def is_manager_in_project(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có role manager trong project không"""
    user = crud_user.get_user(db, user_id)
    if user and user.role == 'admin':
        return True
    
    member = crud_project_member.get_project_member_by_project_and_user(db, project_id, user_id)
    return member and member.role_in_project == 'manager'


def is_expert_in_project(db: Session, project_id: str, user_id: int):
    """Kiểm tra user có role expert trong project không"""
    member = crud_project_member.get_project_member_by_project_and_user(db, project_id, user_id)
    return member and member.role_in_project == 'expert'


# ==================== ENDPOINTS ====================
@router.post("/", response_model=schemas.ExpertTimeEstimateResponse)
def create_estimate(
    estimate: schemas.ExpertTimeEstimateCreate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id")
):
    """Tạo ước lượng thời gian (chỉ expert trong project)"""
    # Lấy user_id từ header, nếu không có thì dùng expert_id trong body
    current_user_id = x_user_id or estimate.expert_id
    
    # Kiểm tra user có role expert trong project không
    if not is_expert_in_project(db, estimate.project_id, current_user_id):
        member = crud_project_member.get_project_member_by_project_and_user(db, estimate.project_id, current_user_id)
        raise HTTPException(
            status_code=403, 
            detail=f"Only experts in this project can create time estimates. Your user_id={current_user_id}, role={member.role_in_project if member else 'not a member'}"
        )
    
    # Phải tạo cho chính mình
    if estimate.expert_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only create estimates for yourself")
    
    task = crud_task.get_task(db, task_id=estimate.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project = crud_project.get_project(db, project_id=estimate.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return crud_expert_time_estimate.create_estimate(db=db, estimate=estimate)


@router.get("/", response_model=List[schemas.ExpertTimeEstimateResponse])
def read_estimates(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    task_id: Optional[int] = Query(None, description="Filter by task ID"),
    expert_id: Optional[int] = Query(None, description="Filter by expert ID"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách ước lượng (tất cả thành viên đều xem được)"""
    if project_id:
        estimates = crud_expert_time_estimate.get_estimates_by_project(db, project_id=project_id, skip=skip, limit=limit)
    elif task_id:
        estimates = crud_expert_time_estimate.get_estimates_by_task(db, task_id=task_id, skip=skip, limit=limit)
    elif expert_id:
        estimates = crud_expert_time_estimate.get_estimates_by_expert(db, expert_id=expert_id, skip=skip, limit=limit)
    else:
        estimates = crud_expert_time_estimate.get_all_estimates(db, skip=skip, limit=limit)
    return estimates


@router.get("/{estimate_id}", response_model=schemas.ExpertTimeEstimateResponse)
def read_estimate(estimate_id: int, db: Session = Depends(get_db)):
    db_estimate = crud_expert_time_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Time estimate not found")
    return db_estimate


@router.put("/{estimate_id}", response_model=schemas.ExpertTimeEstimateResponse)
def update_estimate(
    estimate_id: int, 
    estimate: schemas.ExpertTimeEstimateUpdate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id") 
):
    """Cập nhật ước lượng (chỉ expert của chính estimate đó, nếu chưa duyệt)"""
    # Lấy user_id từ header
    current_user_id = x_user_id or 1
    
    db_estimate = crud_expert_time_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Time estimate not found")
    
    # Chỉ chuyên gia tạo ra mới được sửa
    if db_estimate.expert_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only update your own estimates")
    
    # Không sửa được nếu đã duyệt hoặc từ chối
    if db_estimate.status in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail=f"Cannot update estimate with status: {db_estimate.status}")
    
    db_estimate = crud_expert_time_estimate.update_estimate(db, estimate_id=estimate_id, estimate_update=estimate)
    return db_estimate


@router.delete("/{estimate_id}")
def delete_estimate(
    estimate_id: int, 
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id")
):
    """Xóa ước lượng (manager xóa được tất cả, expert chỉ xóa được của mình)"""
    current_user_id = x_user_id or 1
    
    db_estimate = crud_expert_time_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Time estimate not found")
    
    # Manager có thể xóa bất kỳ
    if is_manager_in_project(db, db_estimate.project_id, current_user_id):
        success = crud_expert_time_estimate.delete_estimate(db, estimate_id=estimate_id)
        if not success:
            raise HTTPException(status_code=404, detail="Time estimate not found")
        return {"message": "Time estimate deleted successfully"}
    
    # Expert chỉ xóa được của mình
    if db_estimate.expert_id == current_user_id:
        success = crud_expert_time_estimate.delete_estimate(db, estimate_id=estimate_id)
        if not success:
            raise HTTPException(status_code=404, detail="Time estimate not found")
        return {"message": "Time estimate deleted successfully"}
    
    raise HTTPException(status_code=403, detail="Only manager or the expert who created the estimate can delete it")


@router.patch("/{estimate_id}/approve")
def approve_estimate(
    estimate_id: int, 
    approver_id: int, 
    db: Session = Depends(get_db)
):
    """Duyệt ước lượng (chỉ manager)"""
    db_estimate = crud_expert_time_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Time estimate not found")
    
    if not is_manager_in_project(db, db_estimate.project_id, approver_id):
        raise HTTPException(status_code=403, detail="Only project manager can approve estimates")
    
    if db_estimate.status == 'approved':
        raise HTTPException(status_code=400, detail="Estimate already approved")
    
    db_estimate = crud_expert_time_estimate.approve_estimate(db, estimate_id=estimate_id, approver_id=approver_id)
    return {"message": "Time estimate approved successfully", "estimate": db_estimate}


@router.patch("/{estimate_id}/reject")
def reject_estimate(
    estimate_id: int, 
    approver_id: int, 
    db: Session = Depends(get_db)
):
    """Từ chối ước lượng (chỉ manager)"""
    db_estimate = crud_expert_time_estimate.get_estimate(db, estimate_id=estimate_id)
    if db_estimate is None:
        raise HTTPException(status_code=404, detail="Time estimate not found")
    
    if not is_manager_in_project(db, db_estimate.project_id, approver_id):
        raise HTTPException(status_code=403, detail="Only project manager can reject estimates")
    
    if db_estimate.status == 'approved':
        raise HTTPException(status_code=400, detail="Cannot reject an already approved estimate")
    
    db_estimate = crud_expert_time_estimate.reject_estimate(db, estimate_id=estimate_id, approver_id=approver_id)
    return {"message": "Time estimate rejected successfully", "estimate": db_estimate}