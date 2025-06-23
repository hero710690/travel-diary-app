from typing import Optional, List, Dict, Any
from ..database.dynamodb import dynamodb_client
from ..models.user import User, UserCreate
from ..models.trip import Trip, TripCreate, TripUpdate
from datetime import datetime, timedelta
import json

class DynamoDBUserService:
    def __init__(self):
        self.db = dynamodb_client

    async def create_user(self, user_data: UserCreate, hashed_password: str) -> Optional[User]:
        try:
            user_dict = {
                'email': user_data.email,
                'username': user_data.username,
                'hashed_password': hashed_password,
                'full_name': user_data.full_name or '',
                'is_active': True
            }
            
            created_user = await self.db.create_user(user_dict)
            return User(**created_user)
        except Exception as e:
            print(f"Error creating user: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        try:
            user_data = await self.db.get_user_by_id(user_id)
            if user_data:
                return User(**user_data)
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        try:
            user_data = await self.db.get_user_by_email(email)
            if user_data:
                return User(**user_data)
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        try:
            user_data = await self.db.get_user_by_username(username)
            if user_data:
                return User(**user_data)
            return None
        except Exception as e:
            print(f"Error getting user by username: {e}")
            return None

class DynamoDBTripService:
    def __init__(self):
        self.db = dynamodb_client

    def _convert_trip_data(self, trip_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB trip data to frontend format"""
        # Map backend field names to frontend
        converted = {
            'id': trip_dict.get('id'),
            'title': trip_dict.get('title'),
            'description': trip_dict.get('description', ''),
            'destination': trip_dict.get('destination'),
            'startDate': trip_dict.get('start_date'),
            'endDate': trip_dict.get('end_date'),
            'duration': trip_dict.get('duration', 1),
            'status': trip_dict.get('status', 'planning'),
            'totalBudget': trip_dict.get('total_budget', 0),
            'currency': trip_dict.get('currency', 'USD'),
            'isPublic': trip_dict.get('is_public', False),
            'tags': trip_dict.get('tags', []),
            'collaborators': trip_dict.get('collaborators', []),
            'wishlist': trip_dict.get('wishlist', []),
            'itinerary': trip_dict.get('itinerary', []),
            'userId': trip_dict.get('user_id'),
            'createdAt': trip_dict.get('created_at'),
            'updatedAt': trip_dict.get('updated_at')
        }
        return converted

    async def create_trip(self, trip_data: TripCreate, user_id: str) -> Optional[Trip]:
        try:
            # Calculate duration
            if trip_data.startDate and trip_data.endDate:
                start_date = datetime.fromisoformat(trip_data.startDate.replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(trip_data.endDate.replace('Z', '+00:00'))
                duration = (end_date - start_date).days + 1
            else:
                duration = 1

            trip_dict = {
                'title': trip_data.title,
                'description': trip_data.description or '',
                'destination': trip_data.destination,
                'startDate': trip_data.startDate,
                'endDate': trip_data.endDate,
                'duration': duration,
                'status': 'planning',
                'totalBudget': trip_data.totalBudget or 0,
                'currency': trip_data.currency or 'USD',
                'isPublic': trip_data.isPublic or False,
                'tags': trip_data.tags or [],
                'collaborators': [],
                'wishlist': [],
                'itinerary': []
            }
            
            created_trip = await self.db.create_trip(trip_dict, user_id)
            converted_trip = self._convert_trip_data(created_trip)
            return Trip(**converted_trip)
        except Exception as e:
            print(f"Error creating trip: {e}")
            return None

    async def get_trip_by_id(self, trip_id: str, user_id: str) -> Optional[Trip]:
        try:
            trip_data = await self.db.get_trip_by_id(trip_id, user_id)
            if trip_data:
                converted_trip = self._convert_trip_data(trip_data)
                return Trip(**converted_trip)
            return None
        except Exception as e:
            print(f"Error getting trip by ID: {e}")
            return None

    async def get_user_trips(self, user_id: str, status: Optional[str] = None, page: int = 1, limit: int = 10) -> List[Trip]:
        try:
            trips_data = await self.db.get_user_trips(user_id, status)
            
            # Apply pagination
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_trips = trips_data[start_idx:end_idx]
            
            trips = []
            for trip_data in paginated_trips:
                converted_trip = self._convert_trip_data(trip_data)
                trips.append(Trip(**converted_trip))
            
            return trips
        except Exception as e:
            print(f"Error getting user trips: {e}")
            return []

    async def update_trip(self, trip_id: str, trip_data: TripUpdate, user_id: str) -> Optional[Trip]:
        try:
            # Convert TripUpdate to dict, excluding None values
            update_dict = {}
            for field, value in trip_data.dict(exclude_unset=True).items():
                if value is not None:
                    update_dict[field] = value

            # Calculate duration if dates are provided
            if 'startDate' in update_dict and 'endDate' in update_dict:
                start_date = datetime.fromisoformat(update_dict['startDate'].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(update_dict['endDate'].replace('Z', '+00:00'))
                update_dict['duration'] = (end_date - start_date).days + 1

            updated_trip = await self.db.update_trip(trip_id, update_dict, user_id)
            if updated_trip:
                converted_trip = self._convert_trip_data(updated_trip)
                return Trip(**converted_trip)
            return None
        except Exception as e:
            print(f"Error updating trip: {e}")
            return None

    async def delete_trip(self, trip_id: str, user_id: str) -> bool:
        try:
            return await self.db.delete_trip(trip_id, user_id)
        except Exception as e:
            print(f"Error deleting trip: {e}")
            return False

    async def update_itinerary(self, trip_id: str, itinerary: List[Dict[str, Any]], user_id: str) -> Optional[Trip]:
        try:
            update_dict = {'itinerary': itinerary}
            updated_trip = await self.db.update_trip(trip_id, update_dict, user_id)
            if updated_trip:
                converted_trip = self._convert_trip_data(updated_trip)
                return Trip(**converted_trip)
            return None
        except Exception as e:
            print(f"Error updating itinerary: {e}")
            return None

    async def update_wishlist(self, trip_id: str, wishlist: List[Dict[str, Any]], user_id: str) -> Optional[Trip]:
        try:
            update_dict = {'wishlist': wishlist}
            updated_trip = await self.db.update_trip(trip_id, update_dict, user_id)
            if updated_trip:
                converted_trip = self._convert_trip_data(updated_trip)
                return Trip(**converted_trip)
            return None
        except Exception as e:
            print(f"Error updating wishlist: {e}")
            return False
