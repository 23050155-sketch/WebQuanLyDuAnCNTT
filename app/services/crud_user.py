from sqlalchemy.orm import Session
from ..models import User
from ..schemas import user as schemas

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    # Trong thực tế nên hash password: hashed = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        password=user.password,  # Nên lưu password đã hash
        fullname=user.fullname,
        email=user.email,
        role=user.role,
        hourly_rate=user.hourly_rate
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if db_user:
        update_data = user_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if key == 'password':
                    # Nên hash password mới: value = get_password_hash(value)
                    pass
                setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False