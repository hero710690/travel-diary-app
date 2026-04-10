from google.cloud import firestore
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class FirestoreClient:
    def __init__(self):
        self.project_id = os.getenv('GCP_PROJECT_ID', '')
        if self.project_id:
            self.db = firestore.Client(project=self.project_id)
        else:
            self.db = firestore.Client()

        # Collection names
        self.users_collection = os.getenv('USERS_COLLECTION', 'users')
        self.trips_collection = os.getenv('TRIPS_COLLECTION', 'trips')
        self.sessions_collection = os.getenv('SESSIONS_COLLECTION', 'sessions')

    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        user_item = {
            'id': user_id,
            'email': user_data['email'],
            'username': user_data['username'],
            'hashed_password': user_data['hashed_password'],
            'full_name': user_data.get('full_name', ''),
            'is_active': user_data.get('is_active', True),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }

        self.db.collection(self.users_collection).document(user_id).set(user_item)
        return user_item

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = self.db.collection(self.users_collection).document(user_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        try:
            docs = self.db.collection(self.users_collection).where(
                'email', '==', email
            ).limit(1).get()
            for doc in docs:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        try:
            docs = self.db.collection(self.users_collection).where(
                'username', '==', username
            ).limit(1).get()
            for doc in docs:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user by username: {e}")
            return None

    # Trip operations
    async def create_trip(self, trip_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        trip_id = str(uuid.uuid4())
        trip_item = {
            'id': trip_id,
            'user_id': user_id,
            'title': trip_data['title'],
            'description': trip_data.get('description', ''),
            'destination': trip_data['destination'],
            'start_date': trip_data['startDate'],
            'end_date': trip_data['endDate'],
            'duration': trip_data.get('duration', 1),
            'status': trip_data.get('status', 'planning'),
            'total_budget': trip_data.get('totalBudget', 0),
            'currency': trip_data.get('currency', 'USD'),
            'is_public': trip_data.get('isPublic', False),
            'tags': trip_data.get('tags', []),
            'collaborators': trip_data.get('collaborators', []),
            'wishlist': trip_data.get('wishlist', []),
            'itinerary': trip_data.get('itinerary', []),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }

        self.db.collection(self.trips_collection).document(trip_id).set(trip_item)
        return trip_item

    async def get_trip_by_id(self, trip_id: str, user_id: str, user_email: str = '') -> Optional[Dict[str, Any]]:
        try:
            doc = self.db.collection(self.trips_collection).document(trip_id).get()
            if doc.exists:
                trip = doc.to_dict()
                # Owner can always access
                if trip['user_id'] == user_id:
                    return trip
                # Public trips are accessible
                if trip.get('is_public', False):
                    return trip
                # Collaborators can access (match by user_id or email)
                for collab in trip.get('collaborators', []):
                    if collab.get('user_id') == user_id:
                        return trip
                    if user_email and collab.get('email') == user_email:
                        return trip
            return None
        except Exception as e:
            print(f"Error getting trip by ID: {e}")
            return None

    async def get_user_trips(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = self.db.collection(self.trips_collection).where(
                'user_id', '==', user_id
            )
            if status:
                query = query.where('status', '==', status)

            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
            docs = query.get()

            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error getting user trips: {e}")
            return []

    async def update_trip(self, trip_id: str, trip_data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        try:
            existing_trip = await self.get_trip_by_id(trip_id, user_id)
            if not existing_trip or existing_trip['user_id'] != user_id:
                return None

            update_data = {'updated_at': datetime.utcnow().isoformat()}

            field_map = {
                'startDate': 'start_date',
                'endDate': 'end_date',
                'totalBudget': 'total_budget',
                'isPublic': 'is_public',
            }

            for key, value in trip_data.items():
                if key in ['title', 'description', 'destination', 'startDate', 'endDate',
                           'duration', 'status', 'totalBudget', 'currency', 'isPublic',
                           'tags', 'collaborators', 'wishlist', 'itinerary']:
                    db_key = field_map.get(key, key)
                    update_data[db_key] = value

            doc_ref = self.db.collection(self.trips_collection).document(trip_id)
            doc_ref.update(update_data)

            updated_doc = doc_ref.get()
            return updated_doc.to_dict()
        except Exception as e:
            print(f"Error updating trip: {e}")
            return None

    async def delete_trip(self, trip_id: str, user_id: str) -> bool:
        try:
            existing_trip = await self.get_trip_by_id(trip_id, user_id)
            if not existing_trip or existing_trip['user_id'] != user_id:
                return False

            self.db.collection(self.trips_collection).document(trip_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting trip: {e}")
            return False

    # Session operations
    async def create_session(self, user_id: str, token_data: Dict[str, Any]) -> str:
        session_id = str(uuid.uuid4())
        session_item = {
            'id': session_id,
            'user_id': user_id,
            'token_data': token_data,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': token_data.get('expires_at')
        }

        self.db.collection(self.sessions_collection).document(session_id).set(session_item)
        return session_id

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = self.db.collection(self.sessions_collection).document(session_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    async def delete_session(self, session_id: str) -> bool:
        try:
            self.db.collection(self.sessions_collection).document(session_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False


# Global Firestore client instance
firestore_client = FirestoreClient()
