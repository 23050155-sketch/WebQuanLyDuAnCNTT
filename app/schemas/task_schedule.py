from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class TaskScheduleBase(BaseModel):
    task_id: int
    user_id: int
    start_date: date          # ✅ Ngày bắt đầu
    end_date: date            # ✅ Ngày kết thúc
    scheduled_hours: float
    actual_hours: float = 0
    notes: Optional[str] = None

class TaskScheduleCreate(TaskScheduleBase):
    project_id: str

class TaskScheduleResponse(TaskScheduleBase):
    schedule_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TaskScheduleUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    scheduled_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    notes: Optional[str] = None