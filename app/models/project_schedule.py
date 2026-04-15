from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date
from datetime import datetime
from ..core.database import Base

class ProjectSchedule(Base):
    __tablename__ = "project_schedule"
    
    schedule_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(20), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    milestone_name = Column(String(200), nullable=False)
    milestone_description = Column(Text, nullable=True)
    milestone_date = Column(Date, nullable=False)
    milestone_type = Column(String(20), default='other')
    status = Column(String(20), default='pending')
    actual_progress = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)