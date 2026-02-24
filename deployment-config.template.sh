#!/bin/bash

# Travel Diary App - Deployment Configuration Template
# Copy this file and customize for your AWS account

# ============================================
# AWS Account Configuration
# ============================================
export AWS_REGION="us-east-1"              # Change to your preferred region (e.g., us-east-1, eu-west-1, ap-southeast-1)
export AWS_ACCOUNT_ID="123456789012"       # Your AWS Account ID (12 digits)
export ENVIRONMENT="prod"                   # Environment: prod, dev, staging

# ============================================
# Resource Naming
# ============================================
export PROJECT_NAME="travel-diary"
export S3_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
export LAMBDA_FUNCTION="${PROJECT_NAME}-${ENVIRONMENT}-backend"
export API_NAME="${PROJECT_NAME}-${ENVIRONMENT}-api"

# ============================================
# DynamoDB Table Names
# ============================================
export USERS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-users-serverless"
export TRIPS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-trips-serverless"
export SESSIONS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-sessions-serverless"
export VERIFICATIONS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-email-verifications"

# ============================================
# Google Maps Configuration
# ============================================
# Get your API key from: https://console.cloud.google.com/google/maps-apis
export GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY_HERE"

# ============================================
# Email Configuration (AWS SES)
# ============================================
# Email address to send verification emails from
# Must be verified in AWS SES before use
export SENDER_EMAIL="noreply@yourdomain.com"

# Optional: Domain for SES (if using domain verification)
export VERIFIED_DOMAIN="yourdomain.com"

# ============================================
# Optional: CloudFront Configuration
# ============================================
# If you create a CloudFront distribution, add the ID here
# export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"

# ============================================
# Validation
# ============================================
echo "Configuration loaded:"
echo "  Region: $AWS_REGION"
echo "  Account: $AWS_ACCOUNT_ID"
echo "  Environment: $ENVIRONMENT"
echo "  S3 Bucket: $S3_BUCKET"
echo "  Lambda Function: $LAMBDA_FUNCTION"
