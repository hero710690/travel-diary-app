"""
Complete FastAPI Travel Diary Backend - Part 1: Core Setup
"""
import json
import os
import boto3
import hashlib
import uuid
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal

# Try to import FastAPI dependencies
try:
    from fastapi import FastAPI, HTTPException, Depends, status, Query, Path
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from pydantic import BaseModel, Field
    from mangum import Mangum
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')

# Pydantic Models
if FASTAPI_AVAILABLE:
    class UserRegister(BaseModel):
        email: str
        password: str
        name: Optional[str] = None

    class UserLogin(BaseModel):
        email: str
        password: str

    class TripCreate(BaseModel):
        title: str
        description: Optional[str] = None
        start_date: str
        end_date: str
        destination: str
        budget: Optional[float] = None

    class TripUpdate(BaseModel):
        title: Optional[str] = None
        description: Optional[str] = None
        start_date: Optional[str] = None
        end_date: Optional[str] = None
        destination: Optional[str] = None
        budget: Optional[float] = None

# Utility Functions
def is_valid_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return str(uuid.uuid4())

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(v) for v in obj]
    return obj

# FastAPI Application
if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="Travel Diary API",
        description="Complete travel diary backend",
        version="2.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    security = HTTPBearer(auto_error=False)

    async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = credentials.credentials
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        
        try:
            response = sessions_table.get_item(Key={'id': token})
            if 'Item' not in response:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            session = response['Item']
            expires_at = datetime.fromisoformat(session['expires_at'])
            if datetime.utcnow() > expires_at:
                raise HTTPException(status_code=401, detail="Token expired")
            
            users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
            user_response = users_table.get_item(Key={'id': session['user_id']})
            
            if 'Item' not in user_response:
                raise HTTPException(status_code=401, detail="User not found")
            
            return user_response['Item']
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Authentication failed")

    @app.get("/health")
    async def health_check():
        return {
            "status": "OK",
            "service": "Travel Diary API",
            "version": "2.0.0",
            "features": ["authentication", "trips", "fastapi"]
        }

    @app.post("/auth/register")
    async def register_user(user_data: UserRegister):
        try:
            if not is_valid_email(user_data.email):
                raise HTTPException(status_code=400, detail="Invalid email format")
            
            if len(user_data.password) < 6:
                raise HTTPException(status_code=400, detail="Password too short")
            
            users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
            
            response = users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': user_data.email.lower()}
            )
            
            if response['Items']:
                raise HTTPException(status_code=409, detail="User already exists")
            
            user_id = str(uuid.uuid4())
            hashed_password = hash_password(user_data.password)
            
            user_record = {
                'id': user_id,
                'email': user_data.email.lower(),
                'password_hash': hashed_password,
                'name': user_data.name or user_data.email.split('@')[0],
                'created_at': datetime.utcnow().isoformat(),
                'is_active': True
            }
            
            users_table.put_item(Item=user_record)
            
            token = generate_token()
            sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
            
            session_record = {
                'id': token,
                'user_id': user_id,
                'email': user_data.email.lower(),
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            
            sessions_table.put_item(Item=session_record)
            
            return {
                "message": "Registration successful",
                "user": {
                    "user_id": user_id,
                    "email": user_data.email.lower(),
                    "name": user_record['name']
                },
                "token": token
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    @app.post("/auth/login")
    async def login_user(user_data: UserLogin):
        try:
            users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
            
            response = users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': user_data.email.lower()}
            )
            
            if not response['Items']:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            user = response['Items'][0]
            
            if user['password_hash'] != hash_password(user_data.password):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            token = generate_token()
            sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
            
            session_record = {
                'id': token,
                'user_id': user['id'],
                'email': user_data.email.lower(),
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            
            sessions_table.put_item(Item=session_record)
            
            return {
                "message": "Login successful",
                "user": {
                    "user_id": user['id'],
                    "email": user['email'],
                    "name": user.get('name', user['email'].split('@')[0])
                },
                "token": token
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

    @app.get("/auth/me")
    async def get_current_user_info(current_user: dict = Depends(get_current_user)):
        return {
            "user": {
                "user_id": current_user['id'],
                "email": current_user['email'],
                "name": current_user.get('name', current_user['email'].split('@')[0]),
                "created_at": current_user.get('created_at')
            }
        }

    @app.get("/trips")
    async def get_trips(current_user: dict = Depends(get_current_user)):
        try:
            trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
            
            response = trips_table.scan(
                FilterExpression='user_id = :user_id',
                ExpressionAttributeValues={':user_id': current_user['id']}
            )
            
            trips = response['Items']
            trips.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            return {
                "trips": decimal_to_float(trips),
                "count": len(trips)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch trips: {str(e)}")

    @app.post("/trips")
    async def create_trip(trip_data: TripCreate, current_user: dict = Depends(get_current_user)):
        try:
            trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
            
            trip_id = str(uuid.uuid4())
            
            trip_record = {
                'id': trip_id,
                'user_id': current_user['id'],
                'title': trip_data.title,
                'description': trip_data.description or '',
                'start_date': trip_data.start_date,
                'end_date': trip_data.end_date,
                'destination': trip_data.destination,
                'budget': Decimal(str(trip_data.budget)) if trip_data.budget else None,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            trips_table.put_item(Item=trip_record)
            
            return {
                "message": "Trip created successfully",
                "trip": decimal_to_float(trip_record)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create trip: {str(e)}")

    @app.get("/")
    async def root():
        return {
            "message": "Travel Diary API",
            "version": "2.0.0",
            "documentation": "/docs",
            "endpoints": {
                "auth": ["/auth/register", "/auth/login", "/auth/me"],
                "trips": ["/trips"]
            }
        }

    handler = Mangum(app, lifespan="off")

    def lambda_handler(event, context):
        return handler(event, context)

else:
    def lambda_handler(event, context):
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "message": "FastAPI not available",
                "status": "OK"
            })
        }
