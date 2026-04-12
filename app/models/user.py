from sqlalchemy import Column, Integer, String, DateTime, DECIMAL
from datetime import datetime
from ..core.database import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    fullname = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(String(20), default='member')
    hourly_rate = Column(DECIMAL(10,2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)