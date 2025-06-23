"""
AWS Lambda handler for FastAPI application
"""
import json
from mangum import Mangum
from .main import app

# Create the Lambda handler
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    """
    AWS Lambda entry point
    """
    try:
        # Use Mangum to handle the Lambda event
        response = handler(event, context)
        return response
    except Exception as e:
        print(f"Error in Lambda handler: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            "body": json.dumps({
                "error": "Internal server error",
                "message": str(e)
            })
        }
