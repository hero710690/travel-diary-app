from datetime import datetime
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from ..models.trip import Trip, TripCreate, TripUpdate, ItineraryItem
from ..models.common import Place


class TripService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.trips

    async def create_trip(self, trip_data: TripCreate, user_id: str) -> Trip:
        """Create a new trip"""
        now = datetime.utcnow().isoformat()
        
        # Convert frontend format to database format
        trip_dict = trip_data.to_trip_base()
        trip_dict.update({
            "user_id": user_id,
            "collaborators": [],
            "wishlist": [],
            "itinerary": [],
            "created_at": now,
            "updated_at": now
        })
        
        result = await self.collection.insert_one(trip_dict)
        trip_dict["_id"] = result.inserted_id
        
        return Trip(**trip_dict)

    async def get_user_trips(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get all trips for a user"""
        cursor = self.collection.find({"user_id": user_id}).skip(skip).limit(limit)
        trips = []
        async for trip_doc in cursor:
            trips.append(Trip(**trip_doc))
        return trips

    async def get_trip_by_id(self, trip_id: str, user_id: str) -> Optional[Trip]:
        """Get trip by ID"""
        if not ObjectId.is_valid(trip_id):
            return None
        
        trip_doc = await self.collection.find_one({
            "_id": ObjectId(trip_id),
            "user_id": user_id
        })
        
        if trip_doc:
            return Trip(**trip_doc)
        return None

    async def update_trip(self, trip_id: str, trip_data: TripUpdate, user_id: str) -> Optional[Trip]:
        """Update trip"""
        if not ObjectId.is_valid(trip_id):
            return None
        
        update_data = {}
        if trip_data.title is not None:
            update_data["title"] = trip_data.title
        if trip_data.description is not None:
            update_data["description"] = trip_data.description
        if trip_data.destination is not None:
            update_data["destination"] = trip_data.destination
        if trip_data.start_date is not None:
            update_data["start_date"] = trip_data.start_date
        if trip_data.end_date is not None:
            update_data["end_date"] = trip_data.end_date
        if trip_data.duration is not None:
            update_data["duration"] = trip_data.duration
        if trip_data.status is not None:
            update_data["status"] = trip_data.status
        if trip_data.is_public is not None:
            update_data["is_public"] = trip_data.is_public
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            await self.collection.update_one(
                {"_id": ObjectId(trip_id), "user_id": user_id},
                {"$set": update_data}
            )
        
        return await self.get_trip_by_id(trip_id, user_id)

    async def delete_trip(self, trip_id: str, user_id: str) -> bool:
        """Delete trip"""
        if not ObjectId.is_valid(trip_id):
            return False
        
        result = await self.collection.delete_one({
            "_id": ObjectId(trip_id),
            "user_id": user_id
        })
        return result.deleted_count > 0

    async def update_itinerary(self, trip_id: str, itinerary: List[ItineraryItem], user_id: str) -> Optional[Trip]:
        """Update trip itinerary"""
        if not ObjectId.is_valid(trip_id):
            return None
        
        # Convert itinerary items to dict format
        itinerary_dicts = [item.dict() for item in itinerary]
        
        await self.collection.update_one(
            {"_id": ObjectId(trip_id), "user_id": user_id},
            {
                "$set": {
                    "itinerary": itinerary_dicts,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return await self.get_trip_by_id(trip_id, user_id)

    async def add_to_wishlist(self, trip_id: str, place: Place, user_id: str) -> Optional[Trip]:
        """Add place to wishlist"""
        if not ObjectId.is_valid(trip_id):
            return None
        
        await self.collection.update_one(
            {"_id": ObjectId(trip_id), "user_id": user_id},
            {
                "$push": {"wishlist": place.dict()},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )
        
        return await self.get_trip_by_id(trip_id, user_id)
