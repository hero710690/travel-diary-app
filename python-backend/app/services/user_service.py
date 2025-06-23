from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from ..models.user import User, UserCreate, UserUpdate, UserInDB
from ..core.security import get_password_hash, verify_password


class UserService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.users

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        now = datetime.utcnow().isoformat()
        
        user_dict = {
            "name": user_data.name,
            "email": user_data.email,
            "hashed_password": get_password_hash(user_data.password),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        result = await self.collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return User(**user_dict)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            return User(**user_doc)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        if not ObjectId.is_valid(user_id):
            return None
            
        user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            return User(**user_doc)
        return None

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user_doc = await self.collection.find_one({"email": email})
        if not user_doc:
            return None
        
        if not verify_password(password, user_doc["hashed_password"]):
            return None
        
        return User(**user_doc)

    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user"""
        if not ObjectId.is_valid(user_id):
            return None
        
        update_data = {}
        if user_data.name is not None:
            update_data["name"] = user_data.name
        if user_data.email is not None:
            update_data["email"] = user_data.email
        if user_data.password is not None:
            update_data["hashed_password"] = get_password_hash(user_data.password)
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
        
        return await self.get_user_by_id(user_id)

    async def delete_user(self, user_id: str) -> bool:
        """Delete user"""
        if not ObjectId.is_valid(user_id):
            return False
        
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0
