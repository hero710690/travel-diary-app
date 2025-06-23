#!/bin/bash

# Create Lambda Function Manually
# Run this once before using GitHub Actions

set -e

# Configuration
AWS_REGION="ap-northeast-1"
PROJECT_NAME="travel-diary"
ENVIRONMENT="prod"
FUNCTION_NAME="$PROJECT_NAME-$ENVIRONMENT-backend"
ROLE_NAME="$PROJECT_NAME-$ENVIRONMENT-lambda-role"

echo "🚀 Creating Lambda Function: $FUNCTION_NAME"
echo "============================================"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📍 Account ID: $ACCOUNT_ID"
echo "📍 Region: $AWS_REGION"
echo ""

# 1. Create IAM Role for Lambda
echo "1️⃣ Creating IAM Role..."
echo "========================"

# Check if role exists
if aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
    echo "✅ IAM role already exists: $ROLE_NAME"
else
    echo "Creating IAM role: $ROLE_NAME"
    
    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create IAM role
    aws iam create-role \
      --role-name $ROLE_NAME \
      --assume-role-policy-document file:///tmp/trust-policy.json \
      --tags Key=Project,Value=$PROJECT_NAME Key=Environment,Value=$ENVIRONMENT
    
    # Attach basic execution policy
    aws iam attach-role-policy \
      --role-name $ROLE_NAME \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Create DynamoDB access policy
    cat > /tmp/dynamodb-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-users-serverless",
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-trips-serverless",
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-sessions-serverless",
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-users-serverless/index/*",
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-trips-serverless/index/*",
        "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/travel-diary-prod-sessions-serverless/index/*"
      ]
    }
  ]
}
EOF
    
    # Attach DynamoDB policy
    aws iam put-role-policy \
      --role-name $ROLE_NAME \
      --policy-name DynamoDBAccess \
      --policy-document file:///tmp/dynamodb-policy.json
    
    echo "✅ IAM role created: $ROLE_NAME"
    
    # Clean up temp files
    rm /tmp/trust-policy.json /tmp/dynamodb-policy.json
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "🔑 Role ARN: $ROLE_ARN"
echo ""

# 2. Create dummy Lambda package
echo "2️⃣ Creating Lambda Function..."
echo "==============================="

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>/dev/null; then
    echo "✅ Lambda function already exists: $FUNCTION_NAME"
else
    echo "Creating Lambda function: $FUNCTION_NAME"
    
    # Create a simple dummy Lambda package
    mkdir -p /tmp/lambda-package
    cat > /tmp/lambda-package/lambda_function.py << EOF
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': '{"message": "Lambda function created successfully! Deploy your app to update this code."}'
    }
EOF
    
    # Create zip package
    cd /tmp/lambda-package
    zip -r ../lambda-dummy.zip .
    cd - > /dev/null
    
    # Wait for IAM role to be ready
    echo "Waiting for IAM role to be ready..."
    sleep 15
    
    # Create Lambda function
    aws lambda create-function \
      --function-name $FUNCTION_NAME \
      --runtime python3.11 \
      --role $ROLE_ARN \
      --handler lambda_function.lambda_handler \
      --zip-file fileb:///tmp/lambda-dummy.zip \
      --timeout 30 \
      --memory-size 512 \
      --environment 'Variables={"DATABASE_TYPE":"dynamodb","USERS_TABLE":"travel-diary-prod-users-serverless","TRIPS_TABLE":"travel-diary-prod-trips-serverless","SESSIONS_TABLE":"travel-diary-prod-sessions-serverless","ENVIRONMENT":"prod","DEBUG":"false"}' \
      --tags Project=$PROJECT_NAME,Environment=$ENVIRONMENT \
      --region $AWS_REGION
    
    echo "✅ Lambda function created: $FUNCTION_NAME"
    
    # Clean up
    rm -rf /tmp/lambda-package /tmp/lambda-dummy.zip
fi

echo ""
echo "🎉 Lambda Function Setup Complete!"
echo "=================================="
echo ""
echo "📊 Function Details:"
echo "  📝 Function Name: $FUNCTION_NAME"
echo "  🔑 IAM Role: $ROLE_NAME"
echo "  📍 Region: $AWS_REGION"
echo ""
echo "🚀 Next Steps:"
echo "  1. Push your code to GitHub"
echo "  2. GitHub Actions will update the Lambda function with your app code"
echo "  3. The function will be ready to handle API requests"
echo ""
echo "💡 Note: This created a dummy function. Your actual app code will be deployed via GitHub Actions."
echo ""
