"""
Working Complete Travel Diary Backend with proper CORS
"""
import json
import os
import boto3
import hashlib
import uuid
import re
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')

def get_cors_headers():
    """Return proper CORS headers"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json"
    }

def create_response(status_code, body, additional_headers=None):
    """Create a proper API Gateway response with CORS headers"""
    headers = get_cors_headers()
    if additional_headers:
        headers.update(additional_headers)
    
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, ensure_ascii=False, default=str)
    }

def is_valid_email(email):
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def hash_password(password):
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    """Generate a simple session token"""
    return str(uuid.uuid4())

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(v) for v in obj]
    return obj

def get_current_user_from_token(token):
    """Get current user from token"""
    if not token:
        return None
    
    try:
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        response = sessions_table.get_item(Key={'id': token})
        
        if 'Item' not in response:
            return None
        
        session = response['Item']
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.utcnow() > expires_at:
            return None
        
        # Get user details
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        user_response = users_table.get_item(Key={'id': session['user_id']})
        
        if 'Item' not in user_response:
            return None
        
        return user_response['Item']
    except Exception as e:
        print(f"Auth error: {str(e)}")
        return None

def handle_options(event, context):
    """Handle OPTIONS preflight requests"""
    return create_response(200, {
        "message": "CORS preflight successful"
    })

def handle_health(event, context):
    """Handle health check"""
    return create_response(200, {
        "status": "OK",
        "service": "Travel Diary API",
        "version": "2.0.0",
        "environment": os.environ.get('ENVIRONMENT', 'prod'),
        "database": "DynamoDB",
        "architecture": "Serverless",
        "cors_enabled": True,
        "features": [
            "authentication",
            "user_management", 
            "trip_planning",
            "complete_backend",
            "cors_fixed"
        ],
        "timestamp": datetime.utcnow().isoformat()
    })

def handle_register(event, context):
    """Handle user registration"""
    try:
        if 'body' not in event or not event['body']:
            return create_response(400, {
                "error": "Missing request body",
                "message": "Registration requires email and password"
            })
        
        body = json.loads(event['body'])
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        name = body.get('name', '').strip()
        
        # Validate input
        if not email or not password:
            return create_response(400, {
                "error": "Missing required fields",
                "message": "Email and password are required"
            })
        
        if not is_valid_email(email):
            return create_response(400, {
                "error": "Invalid email format",
                "message": "Please provide a valid email address"
            })
        
        if len(password) < 6:
            return create_response(400, {
                "error": "Password too short",
                "message": "Password must be at least 6 characters long"
            })
        
        # Check if user already exists
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        
        try:
            response = users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            if response['Items']:
                return create_response(409, {
                    "error": "User already exists",
                    "message": "An account with this email already exists"
                })
        except Exception as e:
            print(f"Error checking existing user: {str(e)}")
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(password)
        
        user_data = {
            'id': user_id,
            'email': email,
            'password_hash': hashed_password,
            'name': name or email.split('@')[0],
            'created_at': datetime.utcnow().isoformat(),
            'is_active': True,
            'profile': {
                'avatar_url': None,
                'bio': None,
                'location': None,
                'preferences': {
                    'currency': 'USD',
                    'timezone': 'UTC',
                    'notifications': True
                }
            }
        }
        
        users_table.put_item(Item=user_data)
        
        # Generate session token
        token = generate_token()
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        
        session_data = {
            'id': token,
            'user_id': user_id,
            'email': email,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        sessions_table.put_item(Item=session_data)
        
        return create_response(201, {
            "message": "Registration successful",
            "user": {
                "user_id": user_id,
                "email": email,
                "name": user_data['name']
            },
            "token": token
        })
        
    except json.JSONDecodeError:
        return create_response(400, {
            "error": "Invalid JSON",
            "message": "Request body must be valid JSON"
        })
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return create_response(500, {
            "error": "Registration failed",
            "message": "An internal error occurred during registration"
        })

def handle_login(event, context):
    """Handle user login"""
    try:
        if 'body' not in event or not event['body']:
            return create_response(400, {
                "error": "Missing request body",
                "message": "Login requires email and password"
            })
        
        body = json.loads(event['body'])
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        
        if not email or not password:
            return create_response(400, {
                "error": "Missing credentials",
                "message": "Email and password are required"
            })
        
        # Find user by email
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        response = users_table.scan(
            FilterExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        if not response['Items']:
            return create_response(401, {
                "error": "Invalid credentials",
                "message": "Email or password is incorrect"
            })
        
        user = response['Items'][0]
        
        # Verify password
        if user['password_hash'] != hash_password(password):
            return create_response(401, {
                "error": "Invalid credentials",
                "message": "Email or password is incorrect"
            })
        
        # Generate session token
        token = generate_token()
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        
        session_data = {
            'id': token,
            'user_id': user['id'],
            'email': email,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        sessions_table.put_item(Item=session_data)
        
        return create_response(200, {
            "message": "Login successful",
            "user": {
                "user_id": user['id'],
                "email": user['email'],
                "name": user.get('name', email.split('@')[0])
            },
            "token": token
        })
        
    except json.JSONDecodeError:
        return create_response(400, {
            "error": "Invalid JSON",
            "message": "Request body must be valid JSON"
        })
    except Exception as e:
        print(f"Login error: {str(e)}")
        return create_response(500, {
            "error": "Login failed",
            "message": "An internal error occurred during login"
        })

def handle_get_user(event, context):
    """Get current user information"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Authentication required",
                "message": "Please provide a valid authorization token"
            })
        
        token = auth_header.replace('Bearer ', '')
        user = get_current_user_from_token(token)
        
        if not user:
            return create_response(401, {
                "error": "Invalid token",
                "message": "Authentication token is invalid or expired"
            })
        
        return create_response(200, {
            "user": decimal_to_float({
                "user_id": user['id'],
                "email": user['email'],
                "name": user.get('name', user['email'].split('@')[0]),
                "created_at": user.get('created_at'),
                "profile": user.get('profile', {})
            })
        })
        
    except Exception as e:
        print(f"Get user error: {str(e)}")
        return create_response(500, {
            "error": "Failed to get user",
            "message": "An internal error occurred"
        })

def handle_get_trips(event, context):
    """Get all trips for current user"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Authentication required",
                "message": "Please provide a valid authorization token"
            })
        
        token = auth_header.replace('Bearer ', '')
        user = get_current_user_from_token(token)
        
        if not user:
            return create_response(401, {
                "error": "Invalid token",
                "message": "Authentication token is invalid or expired"
            })
        
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        response = trips_table.scan(
            FilterExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user['id']}
        )
        
        trips = response['Items']
        trips.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return create_response(200, decimal_to_float(trips))
        
    except Exception as e:
        print(f"Get trips error: {str(e)}")
        return create_response(500, {
            "error": "Failed to fetch trips",
            "message": "An internal error occurred"
        })

def handle_create_trip(event, context):
    """Create a new trip"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Authentication required",
                "message": "Please provide a valid authorization token"
            })
        
        token = auth_header.replace('Bearer ', '')
        user = get_current_user_from_token(token)
        
        if not user:
            return create_response(401, {
                "error": "Invalid token",
                "message": "Authentication token is invalid or expired"
            })
        
        if 'body' not in event or not event['body']:
            return create_response(400, {
                "error": "Missing request body",
                "message": "Trip creation requires trip data"
            })
        
        body = json.loads(event['body'])
        title = body.get('title', '').strip()
        description = body.get('description', '').strip()
        start_date = body.get('start_date', '').strip()
        end_date = body.get('end_date', '').strip()
        destination = body.get('destination', '').strip()
        budget = body.get('budget')
        
        # Validate required fields
        if not title or not start_date or not end_date or not destination:
            return create_response(400, {
                "error": "Missing required fields",
                "message": "Title, start_date, end_date, and destination are required"
            })
        
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        trip_id = str(uuid.uuid4())
        
        trip_record = {
            'id': trip_id,
            'user_id': user['id'],
            'title': title,
            'description': description,
            'start_date': start_date,
            'end_date': end_date,
            'destination': destination,
            'budget': Decimal(str(budget)) if budget else None,
            'status': body.get('status', 'planned'),
            'itinerary': [],  # Initialize empty itinerary
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'stats': {
                'total_expenses': Decimal('0'),
                'journal_entries': 0,
                'photos': 0
            }
        }
        
        trips_table.put_item(Item=trip_record)
        
        return create_response(201, {
            "message": "Trip created successfully",
            "trip": decimal_to_float(trip_record)
        })
        
    except json.JSONDecodeError:
        return create_response(400, {
            "error": "Invalid JSON",
            "message": "Request body must be valid JSON"
        })
    except Exception as e:
        print(f"Create trip error: {str(e)}")
        return create_response(500, {
            "error": "Failed to create trip",
            "message": "An internal error occurred"
        })

def handle_update_trip(event, context):
    """Update an existing trip"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Valid authorization token required"
            })
        
        token = auth_header.replace('Bearer ', '')
        
        # Verify token and get user
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        try:
            session_response = sessions_table.get_item(Key={'id': token})
            if 'Item' not in session_response:
                return create_response(401, {
                    "error": "Unauthorized",
                    "message": "Invalid or expired token"
                })
            
            user_id = session_response['Item']['user_id']
        except Exception as e:
            print(f"Session verification error: {str(e)}")
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Token verification failed"
            })
        
        # Extract trip ID from path
        path = event.get('path', '')
        path_parts = path.strip('/').split('/')
        if len(path_parts) < 2 or path_parts[-2] != 'trips':
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        trip_id = path_parts[-1]
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return create_response(400, {
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            })
        
        # Get existing trip to verify ownership
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        try:
            existing_trip_response = trips_table.get_item(Key={'id': trip_id})
            if 'Item' not in existing_trip_response:
                return create_response(404, {
                    "error": "Trip not found",
                    "message": "The specified trip does not exist"
                })
            
            existing_trip = existing_trip_response['Item']
            if existing_trip['user_id'] != user_id:
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to update this trip"
                })
        except Exception as e:
            print(f"Trip verification error: {str(e)}")
            return create_response(500, {
                "error": "Failed to verify trip",
                "message": "An internal error occurred"
            })
        
        # Update trip fields
        update_expression = "SET updated_at = :updated_at"
        expression_values = {
            ':updated_at': datetime.utcnow().isoformat()
        }
        
        # Update allowed fields
        if 'title' in body:
            update_expression += ", title = :title"
            expression_values[':title'] = body['title']
        
        if 'destination' in body:
            update_expression += ", destination = :destination"
            expression_values[':destination'] = body['destination']
        
        if 'start_date' in body:
            update_expression += ", start_date = :start_date"
            expression_values[':start_date'] = body['start_date']
        
        if 'end_date' in body:
            update_expression += ", end_date = :end_date"
            expression_values[':end_date'] = body['end_date']
        
        if 'description' in body:
            update_expression += ", description = :description"
            expression_values[':description'] = body['description']
        
        if 'status' in body:
            update_expression += ", #status = :status"
            expression_values[':status'] = body['status']
            # Add expression attribute names for reserved keyword
            expression_names = {'#status': 'status'}
        else:
            expression_names = None
        
        # Update the trip
        try:
            update_params = {
                'Key': {'id': trip_id},
                'UpdateExpression': update_expression,
                'ExpressionAttributeValues': expression_values,
                'ReturnValues': 'ALL_NEW'
            }
            
            if expression_names:
                update_params['ExpressionAttributeNames'] = expression_names
            
            response = trips_table.update_item(**update_params)
            updated_trip = response['Attributes']
            
            return create_response(200, {
                "message": "Trip updated successfully",
                "trip": decimal_to_float(updated_trip)
            })
            
        except Exception as e:
            print(f"Trip update error: {str(e)}")
            return create_response(500, {
                "error": "Failed to update trip",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Update trip error: {str(e)}")
        return create_response(500, {
            "error": "Failed to update trip",
            "message": "An internal error occurred"
        })

def handle_delete_trip(event, context):
    """Delete an existing trip"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Valid authorization token required"
            })
        
        token = auth_header.replace('Bearer ', '')
        
        # Verify token and get user
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        try:
            session_response = sessions_table.get_item(Key={'id': token})
            if 'Item' not in session_response:
                return create_response(401, {
                    "error": "Unauthorized",
                    "message": "Invalid or expired token"
                })
            
            user_id = session_response['Item']['user_id']
        except Exception as e:
            print(f"Session verification error: {str(e)}")
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Token verification failed"
            })
        
        # Extract trip ID from path
        path = event.get('path', '')
        path_parts = path.strip('/').split('/')
        if len(path_parts) < 2 or path_parts[-2] != 'trips':
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        trip_id = path_parts[-1]
        
        # Get existing trip to verify ownership
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        try:
            existing_trip_response = trips_table.get_item(Key={'id': trip_id})
            if 'Item' not in existing_trip_response:
                return create_response(404, {
                    "error": "Trip not found",
                    "message": "The specified trip does not exist"
                })
            
            existing_trip = existing_trip_response['Item']
            if existing_trip['user_id'] != user_id:
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to delete this trip"
                })
        except Exception as e:
            print(f"Trip verification error: {str(e)}")
            return create_response(500, {
                "error": "Failed to verify trip",
                "message": "An internal error occurred"
            })
        
        # Delete the trip
        try:
            trips_table.delete_item(Key={'id': trip_id})
            
            return create_response(200, {
                "message": "Trip deleted successfully",
                "trip_id": trip_id
            })
            
        except Exception as e:
            print(f"Trip deletion error: {str(e)}")
            return create_response(500, {
                "error": "Failed to delete trip",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Delete trip error: {str(e)}")
        return create_response(500, {
            "error": "Failed to delete trip",
            "message": "An internal error occurred"
        })

def handle_update_itinerary(event, context):
    """Update trip itinerary"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Valid authorization token required"
            })
        
        token = auth_header.replace('Bearer ', '')
        user = get_current_user_from_token(token)
        
        if not user:
            return create_response(401, {
                "error": "Invalid token",
                "message": "Authentication token is invalid or expired"
            })
        
        # Extract trip ID from path
        path = event.get('path', '')
        # Handle both /trips/{id}/itinerary and /api/v1/trips/{id}/itinerary
        path_parts = path.strip('/').split('/')
        
        trip_id = None
        if len(path_parts) >= 3:
            if path_parts[-1] == 'itinerary':
                if path_parts[-3] == 'trips':
                    trip_id = path_parts[-2]
                elif len(path_parts) >= 5 and path_parts[-4] == 'trips':
                    trip_id = path_parts[-2]
        
        if not trip_id:
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
            itinerary = body.get('itinerary', [])
            
            if not isinstance(itinerary, list):
                return create_response(400, {
                    "error": "Validation error",
                    "message": "Itinerary must be an array"
                })
            
            # Convert float values to Decimal for DynamoDB compatibility
            def convert_floats_to_decimal(obj):
                if isinstance(obj, dict):
                    return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_floats_to_decimal(item) for item in obj]
                elif isinstance(obj, float):
                    return Decimal(str(obj))
                else:
                    return obj
            
            itinerary = convert_floats_to_decimal(itinerary)
            
        except json.JSONDecodeError:
            return create_response(400, {
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            })
        
        # Get existing trip to verify ownership
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        try:
            existing_trip_response = trips_table.get_item(Key={'id': trip_id})
            if 'Item' not in existing_trip_response:
                return create_response(404, {
                    "error": "Trip not found",
                    "message": "The specified trip does not exist"
                })
            
            existing_trip = existing_trip_response['Item']
            if existing_trip['user_id'] != user['id']:
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to update this trip's itinerary"
                })
        except Exception as e:
            print(f"Trip verification error: {str(e)}")
            return create_response(500, {
                "error": "Failed to verify trip",
                "message": "An internal error occurred"
            })
        
        # Update itinerary
        try:
            trips_table.update_item(
                Key={'id': trip_id},
                UpdateExpression="SET itinerary = :itinerary, updated_at = :updated_at",
                ExpressionAttributeValues={
                    ':itinerary': itinerary,
                    ':updated_at': datetime.utcnow().isoformat()
                }
            )
            
            return create_response(200, {
                "message": "Itinerary updated successfully",
                "itinerary": decimal_to_float(itinerary)
            })
            
        except Exception as e:
            print(f"Itinerary update error: {str(e)}")
            return create_response(500, {
                "error": "Failed to update itinerary",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Update itinerary error: {str(e)}")
        return create_response(500, {
            "error": "Failed to update itinerary",
            "message": "An internal error occurred"
        })

def handle_get_trip(event, context):
    """Get a single trip by ID"""
    try:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Valid authorization token required"
            })
        
        token = auth_header.replace('Bearer ', '')
        
        # Verify token and get user
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        try:
            session_response = sessions_table.get_item(Key={'id': token})
            if 'Item' not in session_response:
                return create_response(401, {
                    "error": "Unauthorized",
                    "message": "Invalid or expired token"
                })
            
            user_id = session_response['Item']['user_id']
        except Exception as e:
            print(f"Session verification error: {str(e)}")
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Token verification failed"
            })
        
        # Extract trip ID from path
        path = event.get('path', '')
        path_parts = path.strip('/').split('/')
        if len(path_parts) < 2 or path_parts[-2] != 'trips':
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        trip_id = path_parts[-1]
        
        # Get the trip
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        try:
            trip_response = trips_table.get_item(Key={'id': trip_id})
            if 'Item' not in trip_response:
                return create_response(404, {
                    "error": "Trip not found",
                    "message": "The specified trip does not exist"
                })
            
            trip = trip_response['Item']
            if trip['user_id'] != user_id:
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to view this trip"
                })
            
            return create_response(200, decimal_to_float(trip))
            
        except Exception as e:
            print(f"Trip retrieval error: {str(e)}")
            return create_response(500, {
                "error": "Failed to retrieve trip",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Get trip error: {str(e)}")
        return create_response(500, {
            "error": "Failed to retrieve trip",
            "message": "An internal error occurred"
        })

def lambda_handler(event, context):
    """Main Lambda handler with complete backend functionality"""
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Extract HTTP method and path
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        print(f"Processing: {http_method} {path}")
        
        # Handle OPTIONS requests (CORS preflight)
        if http_method == 'OPTIONS':
            return handle_options(event, context)
        
        # Route requests
        if path == '/health' or path.endswith('/health'):
            return handle_health(event, context)
        elif path == '/auth/register' or path.endswith('/auth/register'):
            if http_method == 'POST':
                return handle_register(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only POST method is allowed for registration"
                })
        elif path == '/auth/login' or path.endswith('/auth/login'):
            if http_method == 'POST':
                return handle_login(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only POST method is allowed for login"
                })
        elif path == '/auth/me' or path.endswith('/auth/me'):
            if http_method == 'GET':
                return handle_get_user(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET method is allowed for user info"
                })
        elif path == '/trips' or path.endswith('/trips'):
            if http_method == 'GET':
                return handle_get_trips(event, context)
            elif http_method == 'POST':
                return handle_create_trip(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET and POST methods are allowed for trips"
                })
        elif '/trips/' in path:
            # Handle itinerary operations: /trips/{id}/itinerary or /api/v1/trips/{id}/itinerary
            if path.endswith('/itinerary'):
                if http_method == 'PUT':
                    return handle_update_itinerary(event, context)
                else:
                    return create_response(405, {
                        "error": "Method not allowed",
                        "message": "Only PUT method is allowed for itinerary updates"
                    })
            # Handle individual trip operations: /trips/{id} or /api/v1/trips/{id}
            elif http_method == 'GET':
                return handle_get_trip(event, context)
            elif http_method == 'PUT':
                return handle_update_trip(event, context)
            elif http_method == 'DELETE':
                return handle_delete_trip(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET, PUT and DELETE methods are allowed for individual trips"
                })
        else:
            # Default response with available endpoints
            return create_response(200, {
                "message": "Travel Diary API - Complete Backend with Itinerary Support",
                "version": "2.1.0",
                "available_endpoints": {
                    "GET /health": "Health check",
                    "POST /auth/register": "User registration",
                    "POST /auth/login": "User login",
                    "GET /auth/me": "Get current user info",
                    "GET /trips": "Get user trips",
                    "POST /trips": "Create new trip",
                    "GET /trips/{id}": "Get single trip",
                    "PUT /trips/{id}": "Update existing trip",
                    "DELETE /trips/{id}": "Delete existing trip",
                    "PUT /trips/{id}/itinerary": "Update trip itinerary"
                },
                "cors_enabled": True,
                "features": [
                    "User Authentication",
                    "Trip Management", 
                    "Itinerary Management",
                    "CORS Support",
                    "Complete Backend"
                ]
            })
            
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {
            "error": "Internal server error",
            "message": str(e),
            "service": "Travel Diary API"
        })
