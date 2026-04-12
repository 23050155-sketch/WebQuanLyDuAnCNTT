from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProjectMemberBase(BaseModel):
    project_id: str
    user_id: int
    role_in_project: str = 'developer'

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberResponse(ProjectMemberBase):
    id: int
    joined_at: datetime
    
    class Config:
        from_attributes = True

class ProjectMemberUpdate(BaseModel):
    role_in_project: Optional[str] = None