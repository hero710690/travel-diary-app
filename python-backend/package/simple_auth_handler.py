import json
import os

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }

def lambda_handler(event, context):
    """Simple AWS Lambda handler with authentication endpoints"""
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': ''
        }
    
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', 'GET')
        
        # Health check endpoint
        if path == '/health' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    "status": "OK",
                    "service": "Travel Diary API",
                    "version": "1.0.0",
                    "environment": "prod",
                    "database": "DynamoDB",
                    "architecture": "Serverless",
                    "features": ["authentication", "user_management", "trip_planning"]
                })
            }
        
        # User registration endpoint (mock for now)
        elif path == '/auth/register' and method == 'POST':
            try:
                body = json.loads(event.get('body', '{}'))
                
                # Mock successful registration
                return {
                    'statusCode': 200,
                    'headers': cors_headers(),
                    'body': json.dumps({
                        "token": "mock-jwt-token-12345",
                        "user": {
                            "_id": "user-123",
                            "name": body.get('name', 'Demo User'),
                            "email": body.get('email', 'demo@example.com'),
                            "preferredCurrency": "USD",
                            "isEmailVerified": False,
                            "createdAt": "2024-01-01T00:00:00Z",
                            "updatedAt": "2024-01-01T00:00:00Z"
                        },
                        "message": "User registered successfully"
                    })
                }
                
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'detail': 'Registration failed'})
                }
        
        # User login endpoint (mock for now)
        elif path == '/auth/login' and method == 'POST':
            try:
                body = json.loads(event.get('body', '{}'))
                
                # Mock successful login
                return {
                    'statusCode': 200,
                    'headers': cors_headers(),
                    'body': json.dumps({
                        "token": "mock-jwt-token-12345",
                        "user": {
                            "_id": "user-123",
                            "name": "Demo User",
                            "email": body.get('email', 'demo@example.com'),
                            "preferredCurrency": "USD",
                            "isEmailVerified": True,
                            "createdAt": "2024-01-01T00:00:00Z",
                            "updatedAt": "2024-01-01T00:00:00Z"
                        },
                        "message": "Login successful"
                    })
                }
                
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'detail': 'Login failed'})
                }
        
        # Get current user endpoint
        elif path == '/auth/me' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    "_id": "user-123",
                    "name": "Demo User",
                    "email": "demo@example.com",
                    "preferredCurrency": "USD",
                    "isEmailVerified": True,
                    "createdAt": "2024-01-01T00:00:00Z",
                    "updatedAt": "2024-01-01T00:00:00Z"
                })
            }
        
        # Trips endpoints
        elif path == '/trips' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    "trips": [
                        {
                            "_id": "trip-123",
                            "title": "Demo Trip to Tokyo",
                            "destination": "Tokyo, Japan",
                            "startDate": "2024-07-01",
                            "endDate": "2024-07-07",
                            "totalBudget": 2000,
                            "currency": "USD",
                            "isPublic": False
                        }
                    ],
                    "message": "Trips retrieved successfully"
                })
            }
        
        elif path == '/trips' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return {
                'statusCode': 201,
                'headers': cors_headers(),
                'body': json.dumps({
                    "_id": "trip-new-123",
                    "title": body.get('title', 'New Trip'),
                    "destination": body.get('destination', 'Unknown'),
                    "message": "Trip created successfully"
                })
            }
        
        # Default response for unmatched routes
        else:
            return {
                'statusCode': 404,
                'headers': cors_headers(),
                'body': json.dumps({
                    'error': 'Not Found',
                    'message': f'Path {path} with method {method} not found',
                    'availableEndpoints': [
                        'GET /health',
                        'POST /auth/register',
                        'POST /auth/login',
                        'GET /auth/me',
                        'GET /trips',
                        'POST /trips'
                    ]
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
