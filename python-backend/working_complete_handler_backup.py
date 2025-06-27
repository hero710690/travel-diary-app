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

def generate_share_token():
    """Generate a secure share token"""
    return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:32]

def generate_invite_token():
    """Generate a secure invite token"""
    return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:24]

def is_valid_role(role):
    """Validate collaborator role"""
    return role in ['viewer', 'editor', 'admin']

def get_role_permissions(role):
    """Get permissions for a role"""
    permissions = {
        'viewer': {
            'view_trip': True,
            'edit_itinerary': False,
            'invite_others': False,
            'manage_settings': False
        },
        'editor': {
            'view_trip': True,
            'edit_itinerary': True,
            'invite_others': False,
            'manage_settings': False
        },
        'admin': {
            'view_trip': True,
            'edit_itinerary': True,
            'invite_others': True,
            'manage_settings': True
        }
    }
    return permissions.get(role, permissions['viewer'])

def can_user_access_trip(trip, user_id, required_permission='view_trip'):
    """Check if user can access trip with required permission"""
    # Trip owner has all permissions
    if trip.get('user_id') == user_id:
        return True
    
    # Check collaborators
    collaborators = trip.get('collaborators', [])
    for collaborator in collaborators:
        if (collaborator.get('user_id') == user_id and 
            collaborator.get('status') == 'accepted'):
            permissions = get_role_permissions(collaborator.get('role', 'viewer'))
            return permissions.get(required_permission, False)
    
    return False

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
            'status': body.get('status', 'planning'),
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
            
            # Check if user has access to this trip (owner or collaborator)
            if not can_user_access_trip(trip, user_id, 'view_trip'):
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

def handle_invite_collaborator(event, context):
    """Invite a collaborator to a trip"""
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
        
        # Get current user details
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        user_response = users_table.get_item(Key={'id': user_id})
        if 'Item' not in user_response:
            return create_response(401, {
                "error": "Unauthorized",
                "message": "User not found"
            })
        
        current_user = user_response['Item']
        
        # Extract trip ID from path
        path = event.get('path', '')
        path_parts = path.strip('/').split('/')
        trip_id = None
        for i, part in enumerate(path_parts):
            if part == 'trips' and i + 1 < len(path_parts):
                trip_id = path_parts[i + 1]
                break
        
        if not trip_id:
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        # Parse request body
        if 'body' not in event or not event['body']:
            return create_response(400, {
                "error": "Missing request body",
                "message": "Email and role are required"
            })
        
        body = json.loads(event['body'])
        email = body.get('email', '').strip().lower()
        role = body.get('role', 'viewer').lower()
        message = body.get('message', '')
        
        # Validate input
        if not email or not is_valid_email(email):
            return create_response(400, {
                "error": "Invalid email",
                "message": "Please provide a valid email address"
            })
        
        if not is_valid_role(role):
            return create_response(400, {
                "error": "Invalid role",
                "message": "Role must be viewer, editor, or admin"
            })
        
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
            
            # Check if user has permission to invite others
            if not can_user_access_trip(trip, user_id, 'invite_others'):
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to invite collaborators to this trip"
                })
            
            # Check if user is already a collaborator
            collaborators = trip.get('collaborators', [])
            for collaborator in collaborators:
                if collaborator.get('email') == email:
                    return create_response(400, {
                        "error": "Already invited",
                        "message": "This user is already invited to the trip"
                    })
            
            # Check if inviting the trip owner
            if trip.get('user_id') == user_id and email == current_user.get('email'):
                return create_response(400, {
                    "error": "Cannot invite self",
                    "message": "You cannot invite yourself to your own trip"
                })
            
            # Find the invited user
            invited_user = None
            try:
                # Scan for user by email (in a real app, you'd have an email index)
                users_scan = users_table.scan(
                    FilterExpression='email = :email',
                    ExpressionAttributeValues={':email': email}
                )
                if users_scan['Items']:
                    invited_user = users_scan['Items'][0]
            except Exception as e:
                print(f"User lookup error: {str(e)}")
            
            # Create collaborator entry
            invite_token = generate_invite_token()
            now = datetime.utcnow().isoformat()
            
            new_collaborator = {
                'user_id': invited_user['id'] if invited_user else '',
                'email': email,
                'name': invited_user['name'] if invited_user else email.split('@')[0],
                'role': role,
                'invited_by': user_id,
                'invited_at': now,
                'status': 'pending',
                'invite_token': invite_token,
                'permissions': get_role_permissions(role)
            }
            
            # Add collaborator to trip
            collaborators.append(new_collaborator)
            
            # Update trip
            trips_table.update_item(
                Key={'id': trip_id},
                UpdateExpression='SET collaborators = :collaborators, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':collaborators': collaborators,
                    ':updated_at': now
                }
            )
            
            # TODO: Send invitation email (would integrate with SES in production)
            
            return create_response(200, {
                "message": "Collaborator invited successfully",
                "collaborator": decimal_to_float(new_collaborator),
                "invite_token": invite_token
            })
            
        except Exception as e:
            print(f"Invite collaborator error: {str(e)}")
            return create_response(500, {
                "error": "Failed to invite collaborator",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Invite collaborator error: {str(e)}")
        return create_response(500, {
            "error": "Failed to invite collaborator",
            "message": "An internal error occurred"
        })

def handle_respond_to_invite(event, context):
    """Accept or decline a collaboration invite"""
    try:
        # Parse request body
        if 'body' not in event or not event['body']:
            return create_response(400, {
                "error": "Missing request body",
                "message": "Action and invite token are required"
            })
        
        body = json.loads(event['body'])
        action = body.get('action', '').lower()
        invite_token = body.get('invite_token', '')
        
        # Validate input
        if action not in ['accept', 'decline']:
            return create_response(400, {
                "error": "Invalid action",
                "message": "Action must be 'accept' or 'decline'"
            })
        
        if not invite_token:
            return create_response(400, {
                "error": "Missing invite token",
                "message": "Invite token is required"
            })
        
        # Extract token from Authorization header (optional for invite response)
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        current_user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
            try:
                session_response = sessions_table.get_item(Key={'id': token})
                if 'Item' in session_response:
                    current_user_id = session_response['Item']['user_id']
            except Exception:
                pass
        
        # Find trip with this invite token
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        # Scan for trip with matching invite token (in production, use GSI)
        try:
            trips_scan = trips_table.scan()
            target_trip = None
            target_collaborator = None
            
            for trip in trips_scan['Items']:
                collaborators = trip.get('collaborators', [])
                for collaborator in collaborators:
                    if collaborator.get('invite_token') == invite_token:
                        target_trip = trip
                        target_collaborator = collaborator
                        break
                if target_trip:
                    break
            
            if not target_trip or not target_collaborator:
                return create_response(404, {
                    "error": "Invalid invite",
                    "message": "Invite token not found or expired"
                })
            
            # Check if invite is still pending
            if target_collaborator.get('status') != 'pending':
                return create_response(400, {
                    "error": "Invite already processed",
                    "message": f"This invite has already been {target_collaborator.get('status')}"
                })
            
            # Update collaborator status
            now = datetime.utcnow().isoformat()
            collaborators = target_trip.get('collaborators', [])
            
            for i, collaborator in enumerate(collaborators):
                if collaborator.get('invite_token') == invite_token:
                    collaborators[i]['status'] = action + 'ed'  # accepted or declined
                    collaborators[i]['responded_at'] = now
                    if action == 'accept':
                        collaborators[i]['accepted_at'] = now
                    break
            
            # Update trip
            trips_table.update_item(
                Key={'id': target_trip['id']},
                UpdateExpression='SET collaborators = :collaborators, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':collaborators': collaborators,
                    ':updated_at': now
                }
            )
            
            return create_response(200, {
                "message": f"Invite {action}ed successfully",
                "trip_id": target_trip['id'],
                "trip_title": target_trip.get('title', 'Untitled Trip'),
                "action": action
            })
            
        except Exception as e:
            print(f"Respond to invite error: {str(e)}")
            return create_response(500, {
                "error": "Failed to process invite response",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Respond to invite error: {str(e)}")
        return create_response(500, {
            "error": "Failed to process invite response",
            "message": "An internal error occurred"
        })

def handle_create_share_link(event, context):
    """Create a shareable link for a trip"""
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
        trip_id = None
        for i, part in enumerate(path_parts):
            if part == 'trips' and i + 1 < len(path_parts):
                trip_id = path_parts[i + 1]
                break
        
        if not trip_id:
            return create_response(400, {
                "error": "Invalid path",
                "message": "Trip ID is required"
            })
        
        # Parse request body
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])
        
        is_public = body.get('is_public', False)
        allow_comments = body.get('allow_comments', False)
        password_protected = body.get('password_protected', False)
        password = body.get('password', '')
        expires_in_days = body.get('expires_in_days', 30)
        
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
            
            # Check if user has permission to manage settings
            if not can_user_access_trip(trip, user_id, 'manage_settings'):
                return create_response(403, {
                    "error": "Forbidden",
                    "message": "You don't have permission to create share links for this trip"
                })
            
            # Generate share token and create share link
            share_token = generate_share_token()
            now = datetime.utcnow().isoformat()
            expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat()
            
            share_link_data = {
                'id': str(uuid.uuid4()),
                'trip_id': trip_id,
                'token': share_token,
                'created_by': user_id,
                'settings': {
                    'is_public': is_public,
                    'allow_comments': allow_comments,
                    'password_protected': password_protected,
                    'password': hash_password(password) if password_protected and password else ''
                },
                'access_count': 0,
                'created_at': now,
                'updated_at': now,
                'expires_at': expires_at
            }
            
            # Store share link (you'd create a separate table for this in production)
            # For now, we'll store it in the trip document
            share_links = trip.get('share_links', [])
            share_links.append(share_link_data)
            
            # Update trip with share link
            trips_table.update_item(
                Key={'id': trip_id},
                UpdateExpression='SET share_links = :share_links, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':share_links': share_links,
                    ':updated_at': now
                }
            )
            
            # Generate public URL
            share_url = f"https://d16hcqzmptnoh8.cloudfront.net/shared/{share_token}"
            
            return create_response(200, {
                "message": "Share link created successfully",
                "share_link": {
                    "id": share_link_data['id'],
                    "url": share_url,
                    "token": share_token,
                    "settings": share_link_data['settings'],
                    "expires_at": expires_at,
                    "created_at": now
                }
            })
            
        except Exception as e:
            print(f"Create share link error: {str(e)}")
            return create_response(500, {
                "error": "Failed to create share link",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Create share link error: {str(e)}")
        return create_response(500, {
            "error": "Failed to create share link",
            "message": "An internal error occurred"
        })

def handle_get_shared_trip(event, context):
    """Get a shared trip by share token"""
    try:
        # Extract share token from path
        path = event.get('path', '')
        path_parts = path.strip('/').split('/')
        share_token = None
        
        for i, part in enumerate(path_parts):
            if part == 'shared' and i + 1 < len(path_parts):
                share_token = path_parts[i + 1]
                break
        
        if not share_token:
            return create_response(400, {
                "error": "Invalid path",
                "message": "Share token is required"
            })
        
        # Find trip with this share token
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        try:
            trips_scan = trips_table.scan()
            target_trip = None
            target_share_link = None
            
            for trip in trips_scan['Items']:
                share_links = trip.get('share_links', [])
                for share_link in share_links:
                    if share_link.get('token') == share_token:
                        target_trip = trip
                        target_share_link = share_link
                        break
                if target_trip:
                    break
            
            if not target_trip or not target_share_link:
                return create_response(404, {
                    "error": "Share link not found",
                    "message": "The shared trip link is invalid or has expired"
                })
            
            # Check if share link has expired
            expires_at = datetime.fromisoformat(target_share_link.get('expires_at', ''))
            if datetime.utcnow() > expires_at:
                return create_response(410, {
                    "error": "Share link expired",
                    "message": "This share link has expired"
                })
            
            # Check password if required
            settings = target_share_link.get('settings', {})
            if settings.get('password_protected', False):
                # Get password from query params or headers
                query_params = event.get('queryStringParameters') or {}
                provided_password = query_params.get('password', '')
                
                if not provided_password:
                    return create_response(401, {
                        "error": "Password required",
                        "message": "This shared trip is password protected"
                    })
                
                if hash_password(provided_password) != settings.get('password', ''):
                    return create_response(401, {
                        "error": "Invalid password",
                        "message": "The provided password is incorrect"
                    })
            
            # Update access count
            target_share_link['access_count'] = target_share_link.get('access_count', 0) + 1
            target_share_link['last_accessed'] = datetime.utcnow().isoformat()
            
            # Update the share link in the trip
            share_links = target_trip.get('share_links', [])
            for i, share_link in enumerate(share_links):
                if share_link.get('token') == share_token:
                    share_links[i] = target_share_link
                    break
            
            trips_table.update_item(
                Key={'id': target_trip['id']},
                UpdateExpression='SET share_links = :share_links',
                ExpressionAttributeValues={
                    ':share_links': share_links
                }
            )
            
            # Return trip data (filtered for public sharing)
            shared_trip = {
                'id': target_trip['id'],
                'title': target_trip.get('title', 'Untitled Trip'),
                'description': target_trip.get('description', ''),
                'destination': target_trip.get('destination', ''),
                'start_date': target_trip.get('start_date', ''),
                'end_date': target_trip.get('end_date', ''),
                'duration': target_trip.get('duration', 1),
                'itinerary': target_trip.get('itinerary', []),
                'wishlist': target_trip.get('wishlist', []),
                'is_shared': True,
                'share_settings': settings
            }
            
            return create_response(200, {
                "message": "Shared trip retrieved successfully",
                "trip": decimal_to_float(shared_trip)
            })
            
        except Exception as e:
            print(f"Get shared trip error: {str(e)}")
            return create_response(500, {
                "error": "Failed to retrieve shared trip",
                "message": "An internal error occurred"
            })
        
    except Exception as e:
        print(f"Get shared trip error: {str(e)}")
        return create_response(500, {
            "error": "Failed to retrieve shared trip",
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
            # Handle collaboration operations
            if '/invite' in path:
                if http_method == 'POST':
                    return handle_invite_collaborator(event, context)
                else:
                    return create_response(405, {
                        "error": "Method not allowed",
                        "message": "Only POST method is allowed for inviting collaborators"
                    })
            elif '/share' in path:
                if http_method == 'POST':
                    return handle_create_share_link(event, context)
                else:
                    return create_response(405, {
                        "error": "Method not allowed",
                        "message": "Only POST method is allowed for creating share links"
                    })
            # Handle itinerary operations: /trips/{id}/itinerary or /api/v1/trips/{id}/itinerary
            elif path.endswith('/itinerary'):
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
        elif path.startswith('/shared/') or path.endswith('/shared'):
            # Handle shared trip access
            if http_method == 'GET':
                return handle_get_shared_trip(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET method is allowed for shared trips"
                })
        elif path == '/invite/respond' or path.endswith('/invite/respond'):
            # Handle invite responses
            if http_method == 'POST':
                return handle_respond_to_invite(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only POST method is allowed for invite responses"
                })
        else:
            # Default response with available endpoints
            return create_response(200, {
                "message": "Travel Diary API - Complete Backend with Collaboration & Sharing",
                "version": "2.2.0",
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
                    "PUT /trips/{id}/itinerary": "Update trip itinerary",
                    "POST /trips/{id}/invite": "Invite collaborator to trip",
                    "POST /trips/{id}/share": "Create shareable link for trip",
                    "GET /shared/{token}": "Access shared trip",
                    "POST /invite/respond": "Accept or decline collaboration invite"
                },
                "cors_enabled": True,
                "features": [
                    "User Authentication",
                    "Trip Management", 
                    "Itinerary Management",
                    "Collaboration & Sharing",
                    "Real-time Invites",
                    "Shareable Links",
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
