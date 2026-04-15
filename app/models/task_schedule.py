from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class TaskSchedule(Base):
    __tablename__ = "task_schedule"
    
    schedule_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)      # ✅ Ngày bắt đầu
    end_date = Column(Date, nullable=False)        # ✅ Ngày kết thúc
    scheduled_hours = Column(DECIMAL(5,2), nullable=False)
    actual_hours = Column(DECIMAL(5,2), default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    task = relationship("Task", backref="schedules")
    user = relationship("User", backref="task_schedules")