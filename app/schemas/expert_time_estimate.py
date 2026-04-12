from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ExpertTimeEstimateBase(BaseModel):
    project_id: str
    task_id: int
    expert_id: int
    optimistic_days: float = 0
    pessimistic_days: float = 0
    most_likely_days: float = 0
    expected_days: float = 0
    confidence_level: int = 50
    reasoning: Optional[str] = None
    status: str = 'draft'

class ExpertTimeEstimateCreate(ExpertTimeEstimateBase):
    pass

class ExpertTimeEstimateResponse(ExpertTimeEstimateBase):
    estimate_id: int
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ExpertTimeEstimateUpdate(BaseModel):
    optimistic_days: Optional[float] = None
    pessimistic_days: Optional[float] = None
    most_likely_days: Optional[float] = None
    expected_days: Optional[float] = None
    confidence_level: Optional[int] = None
    reasoning: Optional[str] = None
    status: Optional[str] = None