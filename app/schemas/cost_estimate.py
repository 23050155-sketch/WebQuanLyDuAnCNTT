from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CostEstimateBase(BaseModel):
    project_id: str
    task_id: int
    expert_id: int
    labor_cost: float = 0
    equipment_cost: float = 0
    office_supplies_cost: float = 0
    training_cost: float = 0
    travel_cost: float = 0
    other_cost: float = 0
    total_cost: float = 0
    notes: Optional[str] = None
    status: str = 'draft'

class CostEstimateCreate(CostEstimateBase):
    pass

class CostEstimateResponse(CostEstimateBase):
    estimate_id: int
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CostEstimateUpdate(BaseModel):
    labor_cost: Optional[float] = None
    equipment_cost: Optional[float] = None
    office_supplies_cost: Optional[float] = None
    training_cost: Optional[float] = None
    travel_cost: Optional[float] = None
    other_cost: Optional[float] = None
    total_cost: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None