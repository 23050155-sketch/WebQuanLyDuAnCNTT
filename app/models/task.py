from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date, DECIMAL
from datetime import datetime
from ..core.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    task_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(20), ForeignKey("projects.project_id"), nullable=False)
    task_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    status = Column(String(20), default='not_started')
    priority = Column(String(20), default='medium')
    planned_start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)
    planned_hours = Column(DECIMAL(8,2), nullable=True)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    actual_hours = Column(DECIMAL(8,2), nullable=True)
    depends_on_task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)