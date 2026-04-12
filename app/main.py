from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .core.database import engine, Base, get_db
from .routers import (
    users_router,
    projects_router,
    project_members_router,
    tasks_router,
    expert_time_estimates_router,
    cost_estimates_router
)
from .services import crud_user
from .schemas import user as user_schemas
from .models import User

# JWT imports
import jwt
from passlib.context import CryptContext

# ==================== CẤU HÌNH AUTH ====================
SECRET_KEY = "your-secret-key-change-this-in-production-123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 giờ

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# ==================== HÀM XỬ LÝ AUTH ====================

def verify_password(plain_password, hashed_password):
    """Kiểm tra mật khẩu"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Mã hóa mật khẩu"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Tạo JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Lấy thông tin user hiện tại từ token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = crud_user.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Lấy user đang hoạt động"""
    return current_user

# ==================== TẠO DATABASE TABLES ====================
Base.metadata.create_all(bind=engine)

# ==================== KHỞI TẠO APP ====================
app = FastAPI(title="Project Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên chỉ định cụ thể domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTH ENDPOINTS ====================

@app.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Đăng nhập để lấy access token"""
    user = crud_user.get_user_by_username(db, username=form_data.username)
    
    # Kiểm tra user tồn tại và mật khẩu đúng
    if not user or user.password != form_data.password:
        # Lưu ý: Trong thực tế nên dùng verify_password(user.password, form_data.password)
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.user_id,
        "username": user.username,
        "fullname": user.fullname,
        "role": user.role
    }

@app.get("/users/me", response_model=user_schemas.UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Lấy thông tin user hiện tại"""
    return current_user

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe server"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# ==================== ROOT ENDPOINT ====================
@app.get("/")
def root():
    return {
        "message": "Project Management API is running",
        "database": "SQLite",
        "version": "1.0.0",
        "auth_required": True,
        "endpoints": {
            "auth": {
                "login": "/token (POST)",
                "current_user": "/users/me (GET)"
            },
            "users": "/users",
            "projects": "/projects",
            "project_members": "/project-members",
            "tasks": "/tasks",
            "expert_time_estimates": "/expert-time-estimates",
            "cost_estimates": "/cost-estimates"
        }
    }

# ==================== REGISTER ROUTERS ====================
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(project_members_router)
app.include_router(tasks_router)
app.include_router(expert_time_estimates_router)
app.include_router(cost_estimates_router)

# ==================== RUN APP ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
    
    
    
