from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, DECIMAL
from datetime import datetime
from ..core.database import Base

class CostEstimate(Base):
    __tablename__ = "cost_estimates"
    
    estimate_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(20), ForeignKey("projects.project_id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    expert_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    labor_cost = Column(DECIMAL(15,2), default=0)
    equipment_cost = Column(DECIMAL(15,2), default=0)
    office_supplies_cost = Column(DECIMAL(15,2), default=0)
    training_cost = Column(DECIMAL(15,2), default=0)
    travel_cost = Column(DECIMAL(15,2), default=0)
    other_cost = Column(DECIMAL(15,2), default=0)
    total_cost = Column(DECIMAL(15,2), default=0)
    
    notes = Column(Text, nullable=True)
    status = Column(String(20), default='draft')
    
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)