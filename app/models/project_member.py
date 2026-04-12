from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from ..core.database import Base

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(20), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    role_in_project = Column(String(20), default='developer')
    joined_at = Column(DateTime, default=datetime.utcnow)