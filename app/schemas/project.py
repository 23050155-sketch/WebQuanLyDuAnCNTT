from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class ProjectBase(BaseModel):
    project_id: str = Field(..., pattern=r'^PRJ-\d{3}$', example="PRJ-001")
    project_name: str = Field(..., max_length=200)
    department: str = Field(..., max_length=100)
    description: Optional[str] = None
    created_by: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = 'planning'
    total_budget: float = 0

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    total_budget: Optional[float] = None