from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    fullname: str = Field(..., max_length=100)
    email: EmailStr
    role: str = 'member'
    hourly_rate: float = 0

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    fullname: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    hourly_rate: Optional[float] = None