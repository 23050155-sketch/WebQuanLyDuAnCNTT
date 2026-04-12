from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class TaskBase(BaseModel):
    project_id: str
    task_name: str = Field(..., max_length=200)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: str = 'not_started'
    priority: str = 'medium'
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    planned_hours: Optional[float] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    actual_hours: Optional[float] = None
    depends_on_task_id: Optional[int] = None
    created_by: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    task_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    planned_hours: Optional[float] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    actual_hours: Optional[float] = None