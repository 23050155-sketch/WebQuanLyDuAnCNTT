from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine, Base
from .routers import (
    users_router,
    projects_router,
    project_members_router,
    tasks_router,
    expert_time_estimates_router,
    cost_estimates_router
)

# Tạo database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Project Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Project Management API is running",
        "database": "SQLite",
        "version": "1.0.0",
        "endpoints": {
            "users": "/users",
            "projects": "/projects",
            "project_members": "/project-members",
            "tasks": "/tasks",
            "expert_time_estimates": "/expert-time-estimates",
            "cost_estimates": "/cost-estimates"
        }
    }

# Register routers
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(project_members_router)
app.include_router(tasks_router)
app.include_router(expert_time_estimates_router)
app.include_router(cost_estimates_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)