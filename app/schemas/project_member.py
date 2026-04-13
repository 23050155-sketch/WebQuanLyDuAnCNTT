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

# ==================== THÊM CLASS NÀY ====================
class ProjectMemberDetailResponse(ProjectMemberResponse):
    """Chi tiết thành viên kèm thông tin user"""
    username: Optional[str] = None
    fullname: Optional[str] = None
    email: Optional[str] = None