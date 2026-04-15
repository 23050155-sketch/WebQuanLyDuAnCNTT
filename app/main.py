from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pathlib import Path
import jwt
from passlib.context import CryptContext

from .core.database import engine, Base, get_db
from .routers import (
    users_router,
    projects_router,
    project_members_router,
    tasks_router,
    expert_time_estimates_router,
    cost_estimates_router,
    project_schedule_router
)
from .services import crud_user
from .schemas import user as user_schemas
from .models import User

# ==================== CẤU HÌNH AUTH ====================
SECRET_KEY = "your-secret-key-change-this-in-production-123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# ==================== HÀM XỬ LÝ AUTH ====================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    return current_user

# ==================== TẠO DATABASE TABLES ====================
Base.metadata.create_all(bind=engine)

# ==================== ĐƯỜNG DẪN THƯ MỤC FRONTEND ====================
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "front-end"

# ==================== KHỞI TẠO APP ====================
app = FastAPI(title="Project Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MOUNT THƯ MỤC TĨNH ====================
# Mount thư mục css, js, assets, html
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
app.mount("/html", StaticFiles(directory=str(FRONTEND_DIR / "html")), name="html")

# ==================== AUTH ENDPOINTS ====================
@app.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = crud_user.get_user_by_username(db, username=form_data.username)
    
    if not user or user.password != form_data.password:
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
    return current_user

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# ==================== ROOT ENDPOINT ====================
@app.get("/")
def root():
    return {
        "message": "Project Management API is running",
        "database": "SQLite",
        "version": "1.0.0",
        "web": {
            "home": "/html/index.html",
            "login": "/html/login.html",
            "create_project": "/html/create-project.html",
            "project_detail": "/html/project-detail.html"
        },
        "api_docs": "/docs"
    }

# ==================== REGISTER ROUTERS ====================
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(project_members_router)
app.include_router(tasks_router)
app.include_router(expert_time_estimates_router)
app.include_router(cost_estimates_router)
app.include_router(project_schedule_router)

# ==================== RUN APP ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)