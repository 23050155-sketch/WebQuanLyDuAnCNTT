from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date, DECIMAL
from datetime import datetime
from ..core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    project_id = Column(String(20), primary_key=True, index=True)
    project_name = Column(String(200), nullable=False)
    department = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default='planning')
    total_budget = Column(DECIMAL(15,2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

