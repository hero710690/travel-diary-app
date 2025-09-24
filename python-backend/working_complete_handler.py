"""
Working Complete Travel Diary Backend with proper CORS and Email Integration
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

# Initialize SES client for email functionality
try:
    ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'ap-northeast-1'))
    EMAIL_ENABLED = True
    print("✅ SES client initialized successfully")
except Exception as e:
    print(f"⚠️  SES client initialization failed: {str(e)}")
    EMAIL_ENABLED = False

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

def send_collaboration_invite_email(
    to_email, inviter_name, inviter_email, trip_title, destination, 
    start_date, end_date, role, invite_token, message=None
):
    """Send collaboration invitation email using SES"""
    if not EMAIL_ENABLED:
        print("📧 Email service not enabled, skipping email send")
        return False
    
    try:
        app_url = os.environ.get('APP_URL', 'https://d16hcqzmptnoh8.cloudfront.net')
        from_email = os.environ.get('FROM_EMAIL', 'noreply@yourdomain.com')
        
        # Generate accept/decline URLs
        accept_url = f"{app_url}/invite/accept?token={invite_token}"
        decline_url = f"{app_url}/invite/decline?token={invite_token}"
        
        # Create email content
        subject = f"You're invited to collaborate on {trip_title}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset='utf-8'><title>Travel Diary Invitation</title></head>
        <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'>
                <h1 style='margin: 0; font-size: 28px;'>🌍 Travel Diary</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Collaborative Trip Planning</p>
            </div>
            <div style='background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;'>
                <h2 style='color: #333; margin-top: 0;'>You're invited to collaborate!</h2>
                <p style='color: #666; font-size: 16px; line-height: 1.6;'>{inviter_name} has invited you to collaborate on their trip:</p>
                <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='color: #333; margin: 0 0 10px 0;'>{trip_title}</h3>
                    <p style='color: #666; margin: 0;'><strong>Destination:</strong> {destination}</p>
                    <p style='color: #666; margin: 5px 0 0 0;'><strong>Dates:</strong> {start_date} - {end_date}</p>
                    <p style='color: #666; margin: 5px 0 0 0;'><strong>Your Role:</strong> {role.title()}</p>
                </div>
                {f'<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;"><p style="color: #1976d2; margin: 0; font-style: italic;">"{message}"</p></div>' if message else ''}
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{accept_url}' style='background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;'>✅ Accept Invitation</a>
                    <a href='{decline_url}' style='background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;'>❌ Decline</a>
                </div>
                <div style='border-top: 1px solid #e1e5e9; padding-top: 20px; margin-top: 30px;'>
                    <p style='color: #999; font-size: 14px; text-align: center; margin: 0;'>This invitation will expire in 7 days. If you have any questions, please contact {inviter_email}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        You're invited to collaborate on {trip_title}!

        {inviter_name} has invited you to collaborate on their trip:

        Trip: {trip_title}
        Destination: {destination}
        Dates: {start_date} - {end_date}
        Your Role: {role.title()}

        {f'Message from {inviter_name}: "{message}"' if message else ''}

        To accept this invitation, visit: {accept_url}
        To decline this invitation, visit: {decline_url}

        This invitation will expire in 7 days.

        ---
        Travel Diary - Collaborative Trip Planning
        {app_url}
        """
        
        # Send email
        response = ses_client.send_email(
            Source=from_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                }
            }
        )
        
        print(f"✅ Collaboration invite sent to {to_email}, MessageId: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send collaboration invite to {to_email}: {str(e)}")
        return False

def send_share_notification_email(to_email, trip_title, destination, share_url, settings):
    """Send share link notification email using SES"""
    if not EMAIL_ENABLED:
        print("📧 Email service not enabled, skipping email send")
        return False
    
    try:
        from_email = os.environ.get('FROM_EMAIL', 'noreply@yourdomain.com')
        
        subject = f"{trip_title} - Shared Trip Link"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset='utf-8'><title>Travel Diary Share</title></head>
        <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'>
                <h1 style='margin: 0; font-size: 28px;'>🌍 Travel Diary</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Trip Sharing</p>
            </div>
            <div style='background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;'>
                <h2 style='color: #333; margin-top: 0;'>Trip Shared Successfully!</h2>
                <p style='color: #666; font-size: 16px; line-height: 1.6;'>Your trip has been shared and is now accessible via the link below:</p>
                <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='color: #333; margin: 0 0 10px 0;'>{trip_title}</h3>
                    <p style='color: #666; margin: 0;'><strong>Destination:</strong> {destination}</p>
                    <p style='color: #666; margin: 5px 0 0 0;'><strong>Share Link:</strong></p>
                    <div style='background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; word-break: break-all;'>
                        <a href='{share_url}' style='color: #2196f3; text-decoration: none;'>{share_url}</a>
                    </div>
                </div>
                <div style='background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;'>
                    <p style='color: #856404; margin: 0; font-size: 14px;'><strong>Security Note:</strong> This link provides {'public' if settings.get('is_public') else 'limited'} access to your trip. {'A password is required to view the trip.' if settings.get('password_protected') else ''}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email
        response = ses_client.send_email(
            Source=from_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        
        print(f"✅ Share notification sent to {to_email}, MessageId: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send share notification to {to_email}: {str(e)}")
        return False

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

def handle_get_shared_trips(event, context):
    """Get all trips where current user is a collaborator"""
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
        
        # Scan all trips to find ones where user is a collaborator
        response = trips_table.scan()
        shared_trips = []
        
        for trip in response['Items']:
            collaborators = trip.get('collaborators', [])
            
            # Check if current user is a collaborator
            user_collaboration = None
            for collaborator in collaborators:
                if collaborator.get('user_id') == user['id']:
                    user_collaboration = collaborator
                    break
            
            if user_collaboration:
                # Get trip owner info
                owner_id = trip.get('user_id')
                owner_info = {'name': 'Unknown', 'email': 'unknown@example.com'}
                
                try:
                    users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
                    owner_response = users_table.get_item(Key={'id': owner_id})
                    if 'Item' in owner_response:
                        owner = owner_response['Item']
                        owner_info = {
                            'name': owner.get('name', owner.get('email', 'Unknown')),
                            'email': owner.get('email', 'unknown@example.com')
                        }
                except Exception as e:
                    print(f"Error fetching owner info: {str(e)}")
                
                # Count itinerary items and collaborators
                itinerary_count = len(trip.get('itinerary', []))
                collaborators_count = len(collaborators)
                
                shared_trip = {
                    'id': trip['id'],
                    'title': trip.get('title', 'Untitled Trip'),
                    'description': trip.get('description'),
                    'destination': trip.get('destination', 'Unknown'),
                    'start_date': trip.get('start_date'),
                    'end_date': trip.get('end_date'),
                    'owner': owner_info,
                    'collaboration': {
                        'role': user_collaboration.get('role', 'viewer'),
                        'invited_at': user_collaboration.get('invited_at'),
                        'accepted_at': user_collaboration.get('accepted_at'),
                        'status': user_collaboration.get('status', 'pending')
                    },
                    'itinerary_count': itinerary_count,
                    'collaborators_count': collaborators_count
                }
                
                shared_trips.append(shared_trip)
        
        # Sort by invitation date (most recent first)
        shared_trips.sort(key=lambda x: x['collaboration'].get('invited_at', ''), reverse=True)
        
        return create_response(200, decimal_to_float(shared_trips))
        
    except Exception as e:
        print(f"Get shared trips error: {str(e)}")
        return create_response(500, {
            "error": "Failed to fetch shared trips",
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
        
        if 'dayNotes' in body:
            update_expression += ", dayNotes = :dayNotes"
            expression_values[':dayNotes'] = body['dayNotes']
        
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
            
            # Ensure dayNotes field is included in response
            if 'dayNotes' not in updated_trip and 'dayNotes' in body:
                updated_trip['dayNotes'] = body['dayNotes']
            
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
            
            # Check if user has permission to edit itinerary (owner or collaborator with editor/admin role)
            if not can_user_access_trip(existing_trip, user['id'], 'edit_itinerary'):
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
            
            # Debug: Print trip data to see if dayNotes exists
            print(f"Retrieved trip data: {trip}")
            print(f"Trip dayNotes field: {trip.get('dayNotes', 'NOT_FOUND')}")
            
            # Ensure dayNotes field exists (initialize as empty array if missing)
            if 'dayNotes' not in trip:
                trip['dayNotes'] = []
            
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
            
            # Send invitation email
            email_sent = False
            if EMAIL_ENABLED:
                try:
                    email_sent = send_collaboration_invite_email(
                        to_email=email,
                        inviter_name=current_user.get('name', current_user.get('email', 'Someone')),
                        inviter_email=current_user.get('email', ''),
                        trip_title=trip.get('title', 'Untitled Trip'),
                        destination=trip.get('destination', ''),
                        start_date=trip.get('start_date', ''),
                        end_date=trip.get('end_date', ''),
                        role=role,
                        invite_token=invite_token,
                        message=message
                    )
                except Exception as e:
                    print(f"Email sending error: {str(e)}")
            
            return create_response(200, {
                "message": "Collaborator invited successfully",
                "collaborator": decimal_to_float(new_collaborator),
                "invite_token": invite_token,
                "email_sent": email_sent,
                "email_enabled": EMAIL_ENABLED
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
            
            # Check if this specific user has already responded to this invite
            # Allow the same token to be used by multiple users, but prevent duplicate responses from the same user
            user_email = None
            if 'Authorization' in event.get('headers', {}):
                try:
                    # Try to get user info if authenticated
                    token = event['headers']['Authorization'].replace('Bearer ', '')
                    # For now, we'll allow unauthenticated responses and track by email later
                    pass
                except:
                    pass
            
            # For reusable invitations, we don't block based on status
            # Instead, we'll track individual responses in a separate field
            if target_collaborator.get('status') != 'pending':
                # If this is a reusable invitation, allow it to be used again
                # We'll create a new acceptance record instead of blocking
                print(f"ℹ️ Reusable invitation token {invite_token} being used again")
            
            # For reusable invitations, track individual responses
            now = datetime.utcnow().isoformat()
            collaborators = target_trip.get('collaborators', [])
            
            # Initialize responses array if it doesn't exist
            if 'responses' not in target_collaborator:
                target_collaborator['responses'] = []
            
            # Add this response to the responses array
            response_record = {
                'action': action,
                'responded_at': now,
                'user_agent': event.get('headers', {}).get('User-Agent', 'Unknown'),
                'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'Unknown')
            }
            
            # Update the collaborator record
            for i, collaborator in enumerate(collaborators):
                if collaborator.get('invite_token') == invite_token:
                    # Keep the invitation active for reuse, but track this response
                    collaborators[i]['responses'] = collaborator.get('responses', []) + [response_record]
                    collaborators[i]['last_response'] = action + 'ed'
                    collaborators[i]['last_responded_at'] = now
                    
                    # For backward compatibility, still update the main status
                    # but don't block future uses
                    if action == 'accept':
                        collaborators[i]['status'] = 'accepted'
                        collaborators[i]['accepted_at'] = now
                    # Note: We don't set status to 'declined' to keep the invitation reusable
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
        send_email = body.get('send_email', False)
        
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
            
            # Send email notification if requested
            email_sent = False
            if send_email and EMAIL_ENABLED:
                try:
                    email_sent = send_share_notification_email(
                        to_email=current_user.get('email', ''),
                        trip_title=trip.get('title', 'Untitled Trip'),
                        destination=trip.get('destination', ''),
                        share_url=share_url,
                        settings=share_link_data['settings']
                    )
                except Exception as e:
                    print(f"Email sending error: {str(e)}")
            
            return create_response(200, {
                "message": "Share link created successfully",
                "share_link": {
                    "id": share_link_data['id'],
                    "url": share_url,
                    "token": share_token,
                    "settings": share_link_data['settings'],
                    "expires_at": expires_at,
                    "created_at": now
                },
                "email_sent": email_sent,
                "email_enabled": EMAIL_ENABLED
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

def handle_create_invitation_link(event, context):
    """Create an invitation link for co-editing"""
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
            
            # Get current user details
            users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
            user_response = users_table.get_item(Key={'id': user_id})
            if 'Item' not in user_response:
                return create_response(401, {
                    "error": "Unauthorized",
                    "message": "User not found"
                })
            
            current_user = user_response['Item']
            
        except Exception as e:
            print(f"Token verification error: {str(e)}")
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Invalid token"
            })
        
        # Parse request body
        if not event.get('body'):
            return create_response(400, {
                "error": "Missing request body",
                "message": "Request body is required"
            })
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_response(400, {
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            })
        
        # Extract trip ID from path
        path = event.get('path', '')
        trip_id = None
        if '/trips/' in path and '/invite-link' in path:
            trip_id = path.split('/trips/')[1].split('/invite-link')[0]
        
        if not trip_id:
            return create_response(400, {
                "error": "Missing trip ID",
                "message": "Trip ID is required"
            })
        
        # Get required fields
        role = body.get('role', 'editor')
        email = body.get('email')  # Optional for general links
        message = body.get('message')
        expires_in_days = body.get('expires_in_days', 7)
        allow_signup = body.get('allow_signup', True)
        
        # Validate role
        if role not in ['viewer', 'editor', 'admin']:
            return create_response(400, {
                "error": "Invalid role",
                "message": "Role must be viewer, editor, or admin"
            })
        
        # Get trip and verify ownership/permissions
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
                    "message": "You don't have permission to create invitations for this trip"
                })
            
        except Exception as e:
            print(f"Trip lookup error: {str(e)}")
            return create_response(500, {
                "error": "Database error",
                "message": "Failed to retrieve trip"
            })
        
        # Generate invitation token and expiration
        invite_token = generate_invite_token()
        now = datetime.utcnow()
        expires_at = now + timedelta(days=expires_in_days)
        
        # Create invitation record
        invitation = {
            'id': str(uuid.uuid4()),
            'token': invite_token,
            'trip_id': trip_id,
            'trip_title': trip.get('title', 'Untitled Trip'),
            'inviter_id': user_id,
            'inviter_name': current_user.get('name', current_user.get('email', 'Someone')),
            'inviter_email': current_user.get('email', ''),
            'invited_email': email,
            'role': role,
            'message': message,
            'allow_signup': allow_signup,
            'status': 'pending',
            'created_at': now.isoformat(),
            'expires_at': expires_at.isoformat(),
            'used_at': None,
            'used_by': None
        }
        
        # Store invitation in trip's invitations array
        invitations = trip.get('invitations', [])
        invitations.append(invitation)
        
        # Update trip with new invitation
        try:
            trips_table.update_item(
                Key={'id': trip_id},
                UpdateExpression='SET invitations = :invitations, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':invitations': invitations,
                    ':updated_at': now.isoformat()
                }
            )
        except Exception as e:
            print(f"Failed to store invitation: {str(e)}")
            return create_response(500, {
                "error": "Failed to create invitation",
                "message": "Could not store invitation"
            })
        
        # Generate invitation URL
        app_url = os.environ.get('APP_URL', 'https://d16hcqzmptnoh8.cloudfront.net')
        invitation_url = f"{app_url}/invite/{invite_token}"
        
        return create_response(200, {
            "message": "Invitation link created successfully",
            "invitation": {
                "id": invitation['id'],
                "token": invite_token,
                "url": invitation_url,
                "trip_id": trip_id,
                "trip_title": invitation['trip_title'],
                "inviter_name": invitation['inviter_name'],
                "inviter_email": invitation['inviter_email'],
                "role": role,
                "message": message,
                "expires_at": expires_at.isoformat(),
                "created_at": now.isoformat(),
                "requires_signup": allow_signup,
                "invited_email": email
            }
        })
        
    except Exception as e:
        print(f"Create invitation link error: {str(e)}")
        return create_response(500, {
            "error": "Failed to create invitation link",
            "message": "An internal error occurred"
        })

def handle_get_invitation_details(event, context):
    """Get invitation details by token"""
    try:
        # Extract invitation token from path
        path = event.get('path', '')
        invite_token = None
        if '/invite/' in path and '/details' in path:
            invite_token = path.split('/invite/')[1].split('/details')[0]
        
        if not invite_token:
            return create_response(400, {
                "error": "Missing invitation token",
                "message": "Invitation token is required"
            })
        
        # Find invitation across all trips
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        try:
            # Scan for trip with matching invitation token
            trips_scan = trips_table.scan()
            target_invitation = None
            target_trip = None
            
            for trip in trips_scan['Items']:
                invitations = trip.get('invitations', [])
                for invitation in invitations:
                    if invitation.get('token') == invite_token:
                        target_invitation = invitation
                        target_trip = trip
                        break
                if target_invitation:
                    break
            
            if not target_invitation or not target_trip:
                return create_response(404, {
                    "error": "Invalid invitation",
                    "message": "Invitation not found or expired"
                })
            
            # Check if invitation is expired
            expires_at = datetime.fromisoformat(target_invitation['expires_at'].replace('Z', '+00:00'))
            if datetime.utcnow().replace(tzinfo=timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
                return create_response(400, {
                    "error": "Invitation expired",
                    "message": "This invitation has expired"
                })
            
            # Check if invitation is already used
            if target_invitation.get('status') != 'pending':
                return create_response(400, {
                    "error": "Invitation already used",
                    "message": f"This invitation has already been {target_invitation.get('status')}"
                })
            
            # Get role permissions
            permissions = get_role_permissions(target_invitation['role'])
            
            return create_response(200, {
                "invitation": {
                    "id": target_invitation['id'],
                    "token": invite_token,
                    "trip_id": target_invitation['trip_id'],
                    "trip_title": target_invitation['trip_title'],
                    "inviter_name": target_invitation['inviter_name'],
                    "inviter_email": target_invitation['inviter_email'],
                    "role": target_invitation['role'],
                    "message": target_invitation.get('message'),
                    "expires_at": target_invitation['expires_at'],
                    "created_at": target_invitation['created_at'],
                    "requires_signup": target_invitation.get('allow_signup', True),
                    "invited_email": target_invitation.get('invited_email')
                },
                "trip": {
                    "id": target_trip['id'],
                    "title": target_trip.get('title', 'Untitled Trip'),
                    "description": target_trip.get('description', ''),
                    "destination": target_trip.get('destination', ''),
                    "start_date": target_trip.get('start_date', ''),
                    "end_date": target_trip.get('end_date', ''),
                    "owner_name": target_invitation['inviter_name']
                },
                "permissions": permissions
            })
            
        except Exception as e:
            print(f"Invitation lookup error: {str(e)}")
            return create_response(500, {
                "error": "Database error",
                "message": "Failed to retrieve invitation"
            })
        
    except Exception as e:
        print(f"Get invitation details error: {str(e)}")
        return create_response(500, {
            "error": "Failed to get invitation details",
            "message": "An internal error occurred"
        })

def handle_register_with_invite(event, context):
    """Register a new user through invitation link"""
    try:
        # Parse request body
        if not event.get('body'):
            return create_response(400, {
                "error": "Missing request body",
                "message": "Request body is required"
            })
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_response(400, {
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            })
        
        # Get required fields
        name = body.get('name', '').strip()
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        invite_token = body.get('invite_token', '')
        
        # Validate input
        if not all([name, email, password, invite_token]):
            return create_response(400, {
                "error": "Missing required fields",
                "message": "Name, email, password, and invitation token are required"
            })
        
        # Validate email format
        if '@' not in email or '.' not in email.split('@')[1]:
            return create_response(400, {
                "error": "Invalid email",
                "message": "Please provide a valid email address"
            })
        
        # Find invitation
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        try:
            # Scan for trip with matching invitation token
            trips_scan = trips_table.scan()
            target_invitation = None
            target_trip = None
            
            for trip in trips_scan['Items']:
                invitations = trip.get('invitations', [])
                for invitation in invitations:
                    if invitation.get('token') == invite_token:
                        target_invitation = invitation
                        target_trip = trip
                        break
                if target_invitation:
                    break
            
            if not target_invitation or not target_trip:
                return create_response(404, {
                    "error": "Invalid invitation",
                    "message": "Invitation not found or expired"
                })
            
            # Check if invitation allows signup
            if not target_invitation.get('allow_signup', True):
                return create_response(403, {
                    "error": "Signup not allowed",
                    "message": "This invitation does not allow new user registration"
                })
            
            # Check if invitation is expired
            expires_at = datetime.fromisoformat(target_invitation['expires_at'].replace('Z', '+00:00'))
            if datetime.utcnow().replace(tzinfo=timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
                return create_response(400, {
                    "error": "Invitation expired",
                    "message": "This invitation has expired"
                })
            
            # Check if invitation is already used
            if target_invitation.get('status') != 'pending':
                return create_response(400, {
                    "error": "Invitation already used",
                    "message": f"This invitation has already been {target_invitation.get('status')}"
                })
            
        except Exception as e:
            print(f"Invitation lookup error: {str(e)}")
            return create_response(500, {
                "error": "Database error",
                "message": "Failed to retrieve invitation"
            })
        
        # Check if user already exists
        users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
        
        try:
            # Scan for existing user with this email
            users_scan = users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            if users_scan['Items']:
                return create_response(400, {
                    "error": "User already exists",
                    "message": "An account with this email already exists. Please sign in instead."
                })
                
        except Exception as e:
            print(f"User existence check error: {str(e)}")
            return create_response(500, {
                "error": "Database error",
                "message": "Failed to check user existence"
            })
        
        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        now = datetime.utcnow().isoformat()
        
        new_user = {
            'id': user_id,
            'name': name,
            'email': email,
            'password_hash': password_hash,
            'created_at': now,
            'updated_at': now
        }
        
        try:
            users_table.put_item(Item=new_user)
        except Exception as e:
            print(f"User creation error: {str(e)}")
            return create_response(500, {
                "error": "Failed to create user",
                "message": "Could not create user account"
            })
        
        # Create session token
        session_token = str(uuid.uuid4())
        session_expires = datetime.utcnow() + timedelta(hours=24)
        
        sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
        
        try:
            sessions_table.put_item(Item={
                'id': session_token,
                'user_id': user_id,
                'expires_at': session_expires.isoformat(),
                'created_at': now
            })
        except Exception as e:
            print(f"Session creation error: {str(e)}")
            return create_response(500, {
                "error": "Failed to create session",
                "message": "Could not create user session"
            })
        
        # Add user as collaborator to the trip
        collaborators = target_trip.get('collaborators', [])
        
        new_collaborator = {
            'user_id': user_id,
            'email': email,
            'name': name,
            'role': target_invitation['role'],
            'invited_by': target_invitation['inviter_id'],
            'invited_at': target_invitation['created_at'],
            'status': 'accepted',
            'accepted_at': now,
            'invite_token': invite_token,
            'permissions': get_role_permissions(target_invitation['role'])
        }
        
        collaborators.append(new_collaborator)
        
        # Mark invitation as used
        invitations = target_trip.get('invitations', [])
        for i, invitation in enumerate(invitations):
            if invitation.get('token') == invite_token:
                invitations[i]['status'] = 'accepted'
                invitations[i]['used_at'] = now
                invitations[i]['used_by'] = user_id
                break
        
        # Update trip with new collaborator and used invitation
        try:
            trips_table.update_item(
                Key={'id': target_trip['id']},
                UpdateExpression='SET collaborators = :collaborators, invitations = :invitations, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':collaborators': collaborators,
                    ':invitations': invitations,
                    ':updated_at': now
                }
            )
        except Exception as e:
            print(f"Failed to update trip with collaborator: {str(e)}")
            return create_response(500, {
                "error": "Failed to add collaborator",
                "message": "Could not add user to trip"
            })
        
        # Return success response
        return create_response(200, {
            "message": "Account created and invitation accepted successfully",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "created_at": now
            },
            "token": session_token,
            "trip_access": {
                "trip_id": target_trip['id'],
                "role": target_invitation['role'],
                "permissions": get_role_permissions(target_invitation['role'])
            }
        })
        
    except Exception as e:
        print(f"Register with invite error: {str(e)}")
        return create_response(500, {
            "error": "Failed to register with invitation",
            "message": "An internal error occurred"
        })

def handle_accept_invitation(event, context):
    """Accept invitation for existing user"""
    try:
        # Extract token from Authorization header (optional for invitation acceptance)
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        user_id = None
        current_user = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            
            # Verify token and get user
            sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'travel-diary-prod-sessions-serverless'))
            try:
                session_response = sessions_table.get_item(Key={'id': token})
                if 'Item' in session_response:
                    user_id = session_response['Item']['user_id']
                    
                    # Get current user details
                    users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'travel-diary-prod-users-serverless'))
                    user_response = users_table.get_item(Key={'id': user_id})
                    if 'Item' in user_response:
                        current_user = user_response['Item']
                        
            except Exception as e:
                print(f"Token verification error: {str(e)}")
        
        if not user_id or not current_user:
            return create_response(401, {
                "error": "Unauthorized",
                "message": "Valid authorization token required"
            })
        
        # Parse request body
        if not event.get('body'):
            return create_response(400, {
                "error": "Missing request body",
                "message": "Request body is required"
            })
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_response(400, {
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            })
        
        invite_token = body.get('invite_token', '')
        
        if not invite_token:
            return create_response(400, {
                "error": "Missing invitation token",
                "message": "Invitation token is required"
            })
        
        # Find invitation
        trips_table = dynamodb.Table(os.environ.get('TRIPS_TABLE', 'travel-diary-prod-trips-serverless'))
        
        try:
            # Scan for trip with matching invitation token
            trips_scan = trips_table.scan()
            target_invitation = None
            target_trip = None
            
            for trip in trips_scan['Items']:
                invitations = trip.get('invitations', [])
                for invitation in invitations:
                    if invitation.get('token') == invite_token:
                        target_invitation = invitation
                        target_trip = trip
                        break
                if target_invitation:
                    break
            
            if not target_invitation or not target_trip:
                return create_response(404, {
                    "error": "Invalid invitation",
                    "message": "Invitation not found or expired"
                })
            
            # Check if invitation is expired
            expires_at = datetime.fromisoformat(target_invitation['expires_at'].replace('Z', '+00:00'))
            if datetime.utcnow().replace(tzinfo=timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
                return create_response(400, {
                    "error": "Invitation expired",
                    "message": "This invitation has expired"
                })
            
            # Check if invitation is already used
            if target_invitation.get('status') != 'pending':
                return create_response(400, {
                    "error": "Invitation already used",
                    "message": f"This invitation has already been {target_invitation.get('status')}"
                })
            
            # Check if user is already a collaborator
            collaborators = target_trip.get('collaborators', [])
            for collaborator in collaborators:
                if collaborator.get('user_id') == user_id or collaborator.get('email') == current_user.get('email'):
                    return create_response(400, {
                        "error": "Already a collaborator",
                        "message": "You are already a collaborator on this trip"
                    })
            
        except Exception as e:
            print(f"Invitation lookup error: {str(e)}")
            return create_response(500, {
                "error": "Database error",
                "message": "Failed to retrieve invitation"
            })
        
        # Add user as collaborator to the trip
        now = datetime.utcnow().isoformat()
        
        new_collaborator = {
            'user_id': user_id,
            'email': current_user.get('email'),
            'name': current_user.get('name'),
            'role': target_invitation['role'],
            'invited_by': target_invitation['inviter_id'],
            'invited_at': target_invitation['created_at'],
            'status': 'accepted',
            'accepted_at': now,
            'invite_token': invite_token,
            'permissions': get_role_permissions(target_invitation['role'])
        }
        
        collaborators.append(new_collaborator)
        
        # Mark invitation as used
        invitations = target_trip.get('invitations', [])
        for i, invitation in enumerate(invitations):
            if invitation.get('token') == invite_token:
                invitations[i]['status'] = 'accepted'
                invitations[i]['used_at'] = now
                invitations[i]['used_by'] = user_id
                break
        
        # Update trip with new collaborator and used invitation
        try:
            trips_table.update_item(
                Key={'id': target_trip['id']},
                UpdateExpression='SET collaborators = :collaborators, invitations = :invitations, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':collaborators': collaborators,
                    ':invitations': invitations,
                    ':updated_at': now
                }
            )
        except Exception as e:
            print(f"Failed to update trip with collaborator: {str(e)}")
            return create_response(500, {
                "error": "Failed to add collaborator",
                "message": "Could not add user to trip"
            })
        
        return create_response(200, {
            "message": "Invitation accepted successfully",
            "trip_id": target_trip['id'],
            "trip_title": target_trip.get('title', 'Untitled Trip'),
            "role": target_invitation['role'],
            "permissions": get_role_permissions(target_invitation['role'])
        })
        
    except Exception as e:
        print(f"Accept invitation error: {str(e)}")
        return create_response(500, {
            "error": "Failed to accept invitation",
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
        elif path == '/trips/shared' or path.endswith('/trips/shared'):
            if http_method == 'GET':
                return handle_get_shared_trips(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET method is allowed for shared trips"
                })
        elif '/trips/' in path:
            # Handle collaboration operations
            if '/invite-link' in path:
                if http_method == 'POST':
                    return handle_create_invitation_link(event, context)
                else:
                    return create_response(405, {
                        "error": "Method not allowed",
                        "message": "Only POST method is allowed for creating invitation links"
                    })
            elif '/invite' in path:
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
        elif '/invite/' in path and '/details' in path:
            # Handle invitation details: /invite/{token}/details
            if http_method == 'GET':
                return handle_get_invitation_details(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only GET method is allowed for invitation details"
                })
        elif path == '/invite/accept' or path.endswith('/invite/accept'):
            # Handle invitation acceptance
            if http_method == 'POST':
                return handle_accept_invitation(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only POST method is allowed for accepting invitations"
                })
        elif path == '/auth/register-with-invite' or path.endswith('/auth/register-with-invite'):
            # Handle registration with invitation
            if http_method == 'POST':
                return handle_register_with_invite(event, context)
            else:
                return create_response(405, {
                    "error": "Method not allowed",
                    "message": "Only POST method is allowed for registration with invitation"
                })
        else:
            # Default response with available endpoints
            return create_response(200, {
                "message": "Travel Diary API - Complete Backend with Collaboration & Sharing + Email",
                "version": "2.3.0",
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
                    "POST /trips/{id}/invite-link": "Create invitation link for co-editing",
                    "POST /trips/{id}/share": "Create shareable link for trip",
                    "GET /shared/{token}": "Access shared trip",
                    "POST /invite/respond": "Accept or decline collaboration invite",
                    "GET /invite/{token}/details": "Get invitation details",
                    "POST /invite/accept": "Accept invitation (existing users)",
                    "POST /auth/register-with-invite": "Register new user with invitation"
                },
                "cors_enabled": True,
                "email_enabled": EMAIL_ENABLED,
                "features": [
                    "User Authentication",
                    "Trip Management", 
                    "Itinerary Management",
                    "Collaboration & Sharing",
                    "Real-time Invites",
                    "Co-editing Invitations",
                    "New User Registration via Invites",
                    "Shareable Links",
                    "Email Notifications" if EMAIL_ENABLED else "Email Notifications (Disabled)",
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
