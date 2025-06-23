import boto3
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import json
from decimal import Decimal

class DynamoDBClient:
    def __init__(self):
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name=self.region)
        
        # Table names
        self.users_table_name = os.getenv('USERS_TABLE', 'travel-diary-users')
        self.trips_table_name = os.getenv('TRIPS_TABLE', 'travel-diary-trips')
        self.sessions_table_name = os.getenv('SESSIONS_TABLE', 'travel-diary-sessions')
        
        # Initialize tables
        self.users_table = self.dynamodb.Table(self.users_table_name)
        self.trips_table = self.dynamodb.Table(self.trips_table_name)
        self.sessions_table = self.dynamodb.Table(self.sessions_table_name)

    def decimal_to_float(self, obj):
        """Convert Decimal objects to float for JSON serialization"""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self.decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.decimal_to_float(v) for v in obj]
        return obj

    def float_to_decimal(self, obj):
        """Convert float objects to Decimal for DynamoDB"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self.float_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.float_to_decimal(v) for v in obj]
        return obj

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
        
        # Convert floats to Decimal
        user_item = self.float_to_decimal(user_item)
        
        self.users_table.put_item(Item=user_item)
        return self.decimal_to_float(user_item)

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.users_table.get_item(Key={'id': user_id})
            if 'Item' in response:
                return self.decimal_to_float(response['Item'])
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            if response['Items']:
                return self.decimal_to_float(response['Items'][0])
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.users_table.scan(
                FilterExpression='username = :username',
                ExpressionAttributeValues={':username': username}
            )
            if response['Items']:
                return self.decimal_to_float(response['Items'][0])
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
        
        # Convert floats to Decimal
        trip_item = self.float_to_decimal(trip_item)
        
        self.trips_table.put_item(Item=trip_item)
        return self.decimal_to_float(trip_item)

    async def get_trip_by_id(self, trip_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.trips_table.get_item(Key={'id': trip_id})
            if 'Item' in response:
                trip = self.decimal_to_float(response['Item'])
                # Check if user has access to this trip
                if trip['user_id'] == user_id or trip.get('is_public', False):
                    return trip
            return None
        except Exception as e:
            print(f"Error getting trip by ID: {e}")
            return None

    async def get_user_trips(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            if status:
                response = self.trips_table.scan(
                    FilterExpression='user_id = :user_id AND #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':user_id': user_id,
                        ':status': status
                    }
                )
            else:
                response = self.trips_table.scan(
                    FilterExpression='user_id = :user_id',
                    ExpressionAttributeValues={':user_id': user_id}
                )
            
            trips = [self.decimal_to_float(item) for item in response['Items']]
            # Sort by created_at descending
            trips.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return trips
        except Exception as e:
            print(f"Error getting user trips: {e}")
            return []

    async def update_trip(self, trip_id: str, trip_data: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        try:
            # First check if trip exists and user has access
            existing_trip = await self.get_trip_by_id(trip_id, user_id)
            if not existing_trip or existing_trip['user_id'] != user_id:
                return None

            # Prepare update expression
            update_expression = "SET updated_at = :updated_at"
            expression_values = {':updated_at': datetime.utcnow().isoformat()}
            
            # Add fields to update
            for key, value in trip_data.items():
                if key in ['title', 'description', 'destination', 'startDate', 'endDate', 
                          'duration', 'status', 'totalBudget', 'currency', 'isPublic', 
                          'tags', 'collaborators', 'wishlist', 'itinerary']:
                    # Map frontend field names to backend
                    db_key = key
                    if key == 'startDate':
                        db_key = 'start_date'
                    elif key == 'endDate':
                        db_key = 'end_date'
                    elif key == 'totalBudget':
                        db_key = 'total_budget'
                    elif key == 'isPublic':
                        db_key = 'is_public'
                    
                    update_expression += f", {db_key} = :{db_key}"
                    expression_values[f":{db_key}"] = self.float_to_decimal(value)

            response = self.trips_table.update_item(
                Key={'id': trip_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values,
                ReturnValues='ALL_NEW'
            )
            
            return self.decimal_to_float(response['Attributes'])
        except Exception as e:
            print(f"Error updating trip: {e}")
            return None

    async def delete_trip(self, trip_id: str, user_id: str) -> bool:
        try:
            # First check if trip exists and user has access
            existing_trip = await self.get_trip_by_id(trip_id, user_id)
            if not existing_trip or existing_trip['user_id'] != user_id:
                return False

            self.trips_table.delete_item(Key={'id': trip_id})
            return True
        except Exception as e:
            print(f"Error deleting trip: {e}")
            return False

    # Session operations (for JWT token management)
    async def create_session(self, user_id: str, token_data: Dict[str, Any]) -> str:
        session_id = str(uuid.uuid4())
        session_item = {
            'id': session_id,
            'user_id': user_id,
            'token_data': token_data,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': token_data.get('expires_at')
        }
        
        self.sessions_table.put_item(Item=session_item)
        return session_id

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.sessions_table.get_item(Key={'id': session_id})
            if 'Item' in response:
                return response['Item']
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    async def delete_session(self, session_id: str) -> bool:
        try:
            self.sessions_table.delete_item(Key={'id': session_id})
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False

# Global DynamoDB client instance
dynamodb_client = DynamoDBClient()
