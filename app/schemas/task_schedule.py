from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class TaskScheduleBase(BaseModel):
    task_id: int
    user_id: int
    scheduled_date: date
    scheduled_hours: float
    actual_hours: float = 0
    notes: Optional[str] = None

class TaskScheduleCreate(TaskScheduleBase):
    project_id: str  # Chỉ dùng để kiểm tra, không lưu vào DB

class TaskScheduleResponse(TaskScheduleBase):
    schedule_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskScheduleUpdate(BaseModel):
    scheduled_date: Optional[date] = None
    scheduled_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    notes: Optional[str] = None