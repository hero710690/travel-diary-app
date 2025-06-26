"""
Complete FastAPI backend for Travel Diary - Simplified version
"""
import json
import os
import boto3
import hashlib
import uuid
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from mangum import Mangum

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')

# Pydantic models
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

# Initialize FastAPI app
app = FastAPI(
    title="Travel Diary API",
    description="Complete travel diary backend with authentication and trip management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

# Utility functions
def is_valid_email(email: str) -> bool:
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate a session token"""
    return str(uuid.uuid4())

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    token = credentials.credentials
    sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
    
    try:
        response = sessions_table.get_item(Key={'id': token})
        if 'Item' not in response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        session = response['Item']
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.utcnow() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        
        # Get user details
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        user_response = users_table.get_item(Key={'id': session['user_id']})
        
        if 'Item' not in user_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user_response['Item']
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "Travel Diary API",
        "version": "1.0.0",
        "environment": os.environ.get('ENVIRONMENT', 'prod'),
        "database": "DynamoDB",
        "architecture": "Serverless",
        "features": [
            "authentication",
            "user_management",
            "trip_planning",
            "fastapi_backend"
        ]
    }

# Authentication endpoints
@app.post("/auth/register")
async def register_user(user_data: UserRegister):
    """Register a new user"""
    try:
        # Validate email
        if not is_valid_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Validate password
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        
        # Check if user already exists
        response = users_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': user_data.email.lower()}
        )
        
        if response['Items']:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create new user
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
        
        # Create session token
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/auth/login")
async def login_user(user_data: UserLogin):
    """Login user"""
    try:
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        
        # Find user by email
        response = users_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': user_data.email.lower()}
        )
        
        if not response['Items']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user = response['Items'][0]
        
        # Verify password
        if user['password_hash'] != hash_password(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create session token
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "user": {
            "user_id": current_user['id'],
            "email": current_user['email'],
            "name": current_user.get('name', current_user['email'].split('@')[0]),
            "created_at": current_user.get('created_at')
        }
    }

# Trip management endpoints
@app.get("/trips")
async def get_trips(current_user: dict = Depends(get_current_user)):
    """Get all trips for current user"""
    try:
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        response = trips_table.scan(
            FilterExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': current_user['id']}
        )
        
        trips = response['Items']
        
        # Sort by created_at descending
        trips.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return {
            "trips": trips,
            "count": len(trips)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch trips: {str(e)}"
        )

@app.post("/trips")
async def create_trip(trip_data: TripCreate, current_user: dict = Depends(get_current_user)):
    """Create a new trip"""
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
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        trips_table.put_item(Item=trip_record)
        
        return {
            "message": "Trip created successfully",
            "trip": trip_record
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create trip: {str(e)}"
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Travel Diary API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": ["/auth/register", "/auth/login", "/auth/me"],
            "trips": ["/trips"]
        }
    }

# Create Lambda handler
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    """Lambda handler for FastAPI"""
    return handler(event, context)
