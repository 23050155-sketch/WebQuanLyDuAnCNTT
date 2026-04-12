from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, DECIMAL
from datetime import datetime
from ..core.database import Base

class ExpertTimeEstimate(Base):
    __tablename__ = "expert_time_estimates"
    
    estimate_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(20), ForeignKey("projects.project_id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    expert_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    optimistic_days = Column(DECIMAL(8,2), default=0)
    pessimistic_days = Column(DECIMAL(8,2), default=0)
    most_likely_days = Column(DECIMAL(8,2), default=0)
    expected_days = Column(DECIMAL(8,2), default=0)
    confidence_level = Column(Integer, default=50)
    reasoning = Column(Text, nullable=True)
    status = Column(String(20), default='draft')
    
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)