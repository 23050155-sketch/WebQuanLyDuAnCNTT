from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class ProjectScheduleBase(BaseModel):
    project_id: str
    milestone_name: str = Field(..., max_length=200)
    milestone_description: Optional[str] = None
    milestone_date: date
    milestone_type: str = 'other'
    status: str = 'pending'
    actual_progress: int = 0
    notes: Optional[str] = None
    updated_by: Optional[int] = None

class ProjectScheduleCreate(ProjectScheduleBase):
    pass

class ProjectScheduleResponse(ProjectScheduleBase):
    schedule_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectScheduleUpdate(BaseModel):
    milestone_name: Optional[str] = None
    milestone_description: Optional[str] = None
    milestone_date: Optional[date] = None
    milestone_type: Optional[str] = None
    status: Optional[str] = None
    actual_progress: Optional[int] = None
    notes: Optional[str] = None
    updated_by: Optional[int] = None