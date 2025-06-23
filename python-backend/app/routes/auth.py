from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from ..models.user import UserCreate, UserLogin, Token, User, UserInDB
from ..core.security import verify_password, get_password_hash, create_access_token, verify_token
from ..services.service_factory import get_user_service
from ..database import get_database

router = APIRouter(prefix="/auth", tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    email = verify_token(token)
    if email is None:
        raise credentials_exception
    
    user_service = get_user_service()
    user = await user_service.get_user_by_email(email)
    
    if user is None:
        raise credentials_exception
    
    return user


@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user"""
    user_service = get_user_service()
    
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = await user_service.create_user(user_data, hashed_password)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "message": "User registered successfully",
        "user": user,
        "token": access_token
    }


@router.post("/login", response_model=dict)
async def login(user_data: UserLogin):
    """Login user with JSON data"""
    user_service = get_user_service()
    
    # Get user by email
    user = await user_service.get_user_by_email(user_data.email)
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "message": "Login successful",
        "user": user,
        "token": access_token
    }


@router.post("/login-form", response_model=dict)
async def login_form(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user with form data (OAuth2 compatible)"""
    user_service = get_user_service()
    
    # Get user by email or username
    user = await user_service.get_user_by_email(form_data.username)
    if not user:
        user = await user_service.get_user_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "message": "Login successful",
        "user": user,
        "token": access_token
    }


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Travel Diary API"
    }
