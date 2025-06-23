from fastapi import APIRouter, HTTPException, Depends, status
from ..models.user import User, UserUpdate
from ..services.user_service import UserService
from ..database import get_database
from .auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@router.put("/me", response_model=dict)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    db = await get_database()
    user_service = UserService(db)
    
    updated_user = await user_service.update_user(str(current_user.id), user_data)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "message": "Profile updated successfully",
        "user": updated_user
    }


@router.delete("/me")
async def delete_current_user(current_user: User = Depends(get_current_user)):
    """Delete current user account"""
    db = await get_database()
    user_service = UserService(db)
    
    success = await user_service.delete_user(str(current_user.id))
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "Account deleted successfully"}
