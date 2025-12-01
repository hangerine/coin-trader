from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
import re

from models import User, SessionLocal, APIKey
from auth import get_db, verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str
    phone_number: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    email: str
    phone_number: str | None = None
    is_active: bool

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserDelete(BaseModel):
    password: str

class PhoneUpdate(BaseModel):
    phone_number: str

class RecoverID(BaseModel):
    phone_number: str

class RecoverPassword(BaseModel):
    email: str
    phone_number: str
    new_password: str

def validate_password(password: str):
    if len(password) < 9:
        raise HTTPException(status_code=400, detail="Password must be at least 9 characters long")
    if not re.match(r'^[a-zA-Z]', password):
        raise HTTPException(status_code=400, detail="Password must start with an alphabet")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    if not re.search(r'[!@#$%_-]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character (!@#$%_-)")

@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    validate_password(user.password)
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, phone_number=user.phone_number, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.put("/password")
def change_password(
    data: PasswordChange, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    validate_password(data.new_password)
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}

@router.delete("/user")
def delete_user(
    data: UserDelete, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    # Delete API Keys first (manual cascade if not set in DB)
    db.query(APIKey).filter(APIKey.user_id == current_user.id).delete()
    
    # Delete User
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account deleted successfully"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "phone_number": current_user.phone_number, "is_active": current_user.is_active}

@router.put("/phone")
def update_phone(
    data: PhoneUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.phone_number = data.phone_number
    db.commit()
    return {"status": "success", "message": "Phone number updated"}

@router.post("/recover/id")
def recover_id(data: RecoverID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with this phone number")
    
    # Mask email: u***@domain.com
    parts = user.email.split('@')
    if len(parts[0]) > 1:
        masked = parts[0][0] + "***" + "@" + parts[1]
    else:
        masked = user.email # Too short to mask safely
        
    return {"email": masked}

@router.post("/recover/password")
def recover_password(data: RecoverPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid email or phone number")
    
    validate_password(data.new_password)
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password reset successfully"}
