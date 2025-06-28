"""
Email Verification Module for Travel Diary Backend
Handles email verification workflow before sending invitations
"""
import json
import os
import boto3
import hashlib
import uuid
import secrets
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'ap-northeast-1'))

# Environment variables
APP_URL = os.environ.get('APP_URL', 'https://d16hcqzmptnoh8.cloudfront.net')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'hero710690@gmail.com')

# DynamoDB table for email verifications
VERIFICATIONS_TABLE = 'travel-diary-prod-email-verifications'

def create_verification_table():
    """Create email verifications table if it doesn't exist"""
    try:
        table = dynamodb.create_table(
            TableName=VERIFICATIONS_TABLE,
            KeySchema=[
                {
                    'AttributeName': 'email',
                    'KeyType': 'HASH'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'email',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'verification_token',
                    'AttributeType': 'S'
                }
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'TokenIndex',
                    'KeySchema': [
                        {
                            'AttributeName': 'verification_token',
                            'KeyType': 'HASH'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    },
                    'BillingMode': 'PAY_PER_REQUEST'
                }
            ],
            BillingMode='PAY_PER_REQUEST',
            Tags=[
                {
                    'Key': 'Project',
                    'Value': 'travel-diary'
                },
                {
                    'Key': 'Environment',
                    'Value': 'prod'
                }
            ]
        )
        print(f"✅ Created email verifications table: {VERIFICATIONS_TABLE}")
        return table
    except dynamodb.meta.client.exceptions.ResourceInUseException:
        # Table already exists
        return dynamodb.Table(VERIFICATIONS_TABLE)
    except Exception as e:
        print(f"❌ Error creating verifications table: {str(e)}")
        return None

def generate_verification_token():
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)

def send_verification_email(email, verification_token):
    """Send email verification email"""
    try:
        verification_link = f"{APP_URL}/verify-email/{verification_token}"
        
        subject = "Verify your email for Travel Diary"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your Email - Travel Diary</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✈️ Travel Diary</h1>
                <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Plan your perfect journey</p>
            </div>
            
            <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Welcome to Travel Diary! 🎉</h2>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                    Thank you for joining Travel Diary! To start receiving trip invitations and notifications, 
                    please verify your email address by clicking the button below.
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{verification_link}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold; 
                              font-size: 16px; 
                              display: inline-block;
                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                        ✅ Verify Email Address
                    </a>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>🔒 Security Note:</strong> This verification link expires in 24 hours for your security.
                        If you didn't request this verification, you can safely ignore this email.
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{verification_link}" style="color: #667eea; word-break: break-all;">{verification_link}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    This email was sent by Travel Diary. If you have any questions, please contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to Travel Diary!
        
        Thank you for joining Travel Diary! To start receiving trip invitations and notifications, 
        please verify your email address by visiting this link:
        
        {verification_link}
        
        This verification link expires in 24 hours for your security.
        If you didn't request this verification, you can safely ignore this email.
        
        ---
        Travel Diary Team
        """
        
        response = ses_client.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                }
            }
        )
        
        print(f"✅ Verification email sent to {email}, MessageId: {response['MessageId']}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send verification email to {email}: {str(e)}")
        return False

def request_email_verification(email):
    """Request email verification for a new email address"""
    try:
        # Create table if it doesn't exist
        table = create_verification_table()
        if not table:
            return {
                'success': False,
                'message': 'Database error',
                'email_sent': False
            }
        
        # Check if email is already verified
        try:
            response = table.get_item(Key={'email': email})
            if 'Item' in response and response['Item'].get('verified', False):
                return {
                    'success': True,
                    'message': 'Email already verified',
                    'email_sent': False,
                    'already_verified': True
                }
        except Exception as e:
            print(f"Error checking existing verification: {str(e)}")
        
        # Generate new verification token
        verification_token = generate_verification_token()
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Store verification record
        table.put_item(
            Item={
                'email': email,
                'verification_token': verification_token,
                'verified': False,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': expires_at.isoformat(),
                'attempts': 1
            }
        )
        
        # Send verification email
        email_sent = send_verification_email(email, verification_token)
        
        return {
            'success': True,
            'message': 'Verification email sent successfully',
            'email_sent': email_sent,
            'expires_in_hours': 24
        }
        
    except Exception as e:
        print(f"❌ Error requesting email verification: {str(e)}")
        return {
            'success': False,
            'message': f'Error processing verification request: {str(e)}',
            'email_sent': False
        }

def verify_email_token(verification_token):
    """Verify an email using the verification token"""
    try:
        table = dynamodb.Table(VERIFICATIONS_TABLE)
        
        # Query by token using GSI
        response = table.query(
            IndexName='TokenIndex',
            KeyConditionExpression='verification_token = :token',
            ExpressionAttributeValues={':token': verification_token}
        )
        
        if not response['Items']:
            return {
                'success': False,
                'message': 'Invalid verification token',
                'verified': False
            }
        
        verification = response['Items'][0]
        
        # Check if token has expired
        expires_at = datetime.fromisoformat(verification['expires_at'])
        if datetime.utcnow() > expires_at:
            return {
                'success': False,
                'message': 'Verification token has expired',
                'verified': False,
                'expired': True
            }
        
        # Check if already verified
        if verification.get('verified', False):
            return {
                'success': True,
                'message': 'Email already verified',
                'verified': True,
                'email': verification['email']
            }
        
        # Mark as verified
        table.update_item(
            Key={'email': verification['email']},
            UpdateExpression='SET verified = :verified, verified_at = :verified_at',
            ExpressionAttributeValues={
                ':verified': True,
                ':verified_at': datetime.utcnow().isoformat()
            }
        )
        
        return {
            'success': True,
            'message': 'Email verified successfully',
            'verified': True,
            'email': verification['email']
        }
        
    except Exception as e:
        print(f"❌ Error verifying email token: {str(e)}")
        return {
            'success': False,
            'message': f'Error verifying email: {str(e)}',
            'verified': False
        }

def is_email_verified(email):
    """Check if an email address is verified"""
    try:
        table = dynamodb.Table(VERIFICATIONS_TABLE)
        response = table.get_item(Key={'email': email})
        
        if 'Item' in response:
            return response['Item'].get('verified', False)
        
        return False
        
    except Exception as e:
        print(f"❌ Error checking email verification status: {str(e)}")
        return False

def get_verification_status(email):
    """Get detailed verification status for an email"""
    try:
        table = dynamodb.Table(VERIFICATIONS_TABLE)
        response = table.get_item(Key={'email': email})
        
        if 'Item' in response:
            item = response['Item']
            return {
                'email': email,
                'verified': item.get('verified', False),
                'created_at': item.get('created_at'),
                'verified_at': item.get('verified_at'),
                'expires_at': item.get('expires_at'),
                'attempts': item.get('attempts', 0)
            }
        
        return {
            'email': email,
            'verified': False,
            'exists': False
        }
        
    except Exception as e:
        print(f"❌ Error getting verification status: {str(e)}")
        return {
            'email': email,
            'verified': False,
            'error': str(e)
        }
