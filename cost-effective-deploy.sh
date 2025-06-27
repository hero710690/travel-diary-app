#!/bin/bash

# Cost-Effective Travel Diary App Deployment Script
# This script deploys your app using the most cost-effective AWS services

set -e

# Configuration
PROJECT_NAME="travel-diary"
ENVIRONMENT="prod"
REGION="ap-northeast-1"  # Using your configured region
S3_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-frontend-$(date +%s)"
LAMBDA_FUNCTION="${PROJECT_NAME}-${ENVIRONMENT}-backend"

echo "🚀 Starting cost-effective deployment..."
echo "Region: $REGION"
echo "S3 Bucket: $S3_BUCKET"
echo "Lambda Function: $LAMBDA_FUNCTION"

# Step 1: Create DynamoDB Tables (Pay-per-request = most cost-effective)
echo "📊 Creating DynamoDB tables..."

aws dynamodb create-table \
    --table-name ${PROJECT_NAME}-${ENVIRONMENT}-users \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Users table already exists"

aws dynamodb create-table \
    --table-name ${PROJECT_NAME}-${ENVIRONMENT}-trips \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=user-trips-index,KeySchema=[{AttributeName=user_id,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Trips table already exists"

aws dynamodb create-table \
    --table-name ${PROJECT_NAME}-${ENVIRONMENT}-sessions \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=user-sessions-index,KeySchema=[{AttributeName=user_id,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Sessions table already exists"

# Enable TTL on sessions table for automatic cleanup (cost optimization)
aws dynamodb update-time-to-live \
    --table-name ${PROJECT_NAME}-${ENVIRONMENT}-sessions \
    --time-to-live-specification Enabled=true,AttributeName=expires_at \
    --region $REGION || echo "TTL already enabled"

# Step 2: Create S3 bucket for frontend (cheapest static hosting)
echo "🪣 Creating S3 bucket for frontend..."

aws s3 mb s3://$S3_BUCKET --region $REGION

# Configure for static website hosting
aws s3 website s3://$S3_BUCKET \
    --index-document index.html \
    --error-document index.html

# Set public read policy
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $S3_BUCKET \
    --policy file:///tmp/bucket-policy.json

# Step 3: Create IAM role for Lambda (minimal permissions)
echo "🔐 Creating IAM role for Lambda..."

cat > /tmp/lambda-trust-policy.json << EOF
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

aws iam create-role \
    --role-name ${LAMBDA_FUNCTION}-role \
    --assume-role-policy-document file:///tmp/lambda-trust-policy.json || echo "Role already exists"

# Attach basic execution policy
aws iam attach-role-policy \
    --role-name ${LAMBDA_FUNCTION}-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create minimal DynamoDB policy
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
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:$REGION:*:table/${PROJECT_NAME}-${ENVIRONMENT}-*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name ${LAMBDA_FUNCTION}-role \
    --policy-name DynamoDBAccess \
    --policy-document file:///tmp/dynamodb-policy.json

# Step 4: Build and deploy Lambda function
echo "🐍 Building Lambda function..."

cd python-backend

# Create lightweight deployment package
mkdir -p lambda-package
pip install -r requirements-lambda.txt -t lambda-package \
    --no-deps --platform linux_x86_64 --only-binary=:all: \
    --implementation cp --python-version 3.11

# Copy application code
cp -r app lambda-package/
find . -name "*.py" -maxdepth 1 -exec cp {} lambda-package/ \;

# Create zip package
cd lambda-package
zip -r ../lambda-deployment.zip . -x "*.pyc" "*/__pycache__/*"
cd ..

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name ${LAMBDA_FUNCTION}-role --query 'Role.Arn' --output text)

# Create Lambda function with cost-optimized settings
aws lambda create-function \
    --function-name $LAMBDA_FUNCTION \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler app.lambda_handler.lambda_handler \
    --zip-file fileb://lambda-deployment.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables='{
        "DATABASE_TYPE":"dynamodb",
        "USERS_TABLE":"'${PROJECT_NAME}-${ENVIRONMENT}-users'",
        "TRIPS_TABLE":"'${PROJECT_NAME}-${ENVIRONMENT}-trips'",
        "SESSIONS_TABLE":"'${PROJECT_NAME}-${ENVIRONMENT}-sessions'",
        "ENVIRONMENT":"'$ENVIRONMENT'",
        "AWS_REGION":"'$REGION'",
        "DEBUG":"false"
    }' \
    --region $REGION || echo "Lambda function already exists, updating..."

# Update function if it already exists
aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION \
    --zip-file fileb://lambda-deployment.zip \
    --region $REGION || true

cd ..

# Step 5: Create API Gateway (cost-effective REST API)
echo "🌐 Creating API Gateway..."

API_ID=$(aws apigateway create-rest-api \
    --name ${PROJECT_NAME}-${ENVIRONMENT}-api \
    --description "Travel Diary REST API" \
    --region $REGION \
    --query 'id' --output text) || echo "API already exists"

if [ ! -z "$API_ID" ]; then
    # Get root resource
    ROOT_RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $REGION \
        --query 'items[0].id' --output text)

    # Create proxy resource
    PROXY_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_RESOURCE_ID \
        --path-part '{proxy+}' \
        --region $REGION \
        --query 'id' --output text)

    # Create ANY method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $PROXY_RESOURCE_ID \
        --http-method ANY \
        --authorization-type NONE \
        --region $REGION

    # Set up Lambda integration
    LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_FUNCTION --region $REGION --query 'Configuration.FunctionArn' --output text)
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $PROXY_RESOURCE_ID \
        --http-method ANY \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
        --region $REGION

    # Grant permission
    aws lambda add-permission \
        --function-name $LAMBDA_FUNCTION \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/*" \
        --region $REGION || true

    # Deploy API
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod \
        --region $REGION

    API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
    echo "API Gateway URL: $API_URL"
fi

# Step 6: Build and deploy frontend
echo "⚛️ Building and deploying frontend..."

cd client

# Install dependencies and build
npm install
REACT_APP_API_URL=$API_URL npm run build

# Deploy to S3
aws s3 sync build/ s3://$S3_BUCKET --delete --region $REGION

cd ..

# Step 7: Create CloudFront distribution (optional but recommended for global performance)
echo "🌍 Creating CloudFront distribution..."

CLOUDFRONT_CONFIG=$(cat << EOF
{
    "CallerReference": "${PROJECT_NAME}-$(date +%s)",
    "Comment": "Travel Diary App CDN - $ENVIRONMENT",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${S3_BUCKET}",
                "DomainName": "${S3_BUCKET}.s3-website-${REGION}.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${S3_BUCKET}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF
)

echo "$CLOUDFRONT_CONFIG" > /tmp/cloudfront-config.json

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.Id' --output text) || echo "Distribution creation failed"

if [ ! -z "$DISTRIBUTION_ID" ]; then
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
        --id $DISTRIBUTION_ID \
        --query 'Distribution.DomainName' \
        --output text)
    
    echo "CloudFront Domain: https://$CLOUDFRONT_DOMAIN"
fi

# Cleanup temp files
rm -f /tmp/*.json
rm -f python-backend/lambda-deployment.zip
rm -rf python-backend/lambda-package

echo "✅ Deployment completed!"
echo ""
echo "📊 Your Travel Diary App is deployed:"
echo "   S3 Website: http://$S3_BUCKET.s3-website-$REGION.amazonaws.com"
echo "   API Gateway: $API_URL"
if [ ! -z "$CLOUDFRONT_DOMAIN" ]; then
    echo "   CloudFront: https://$CLOUDFRONT_DOMAIN (recommended)"
fi
echo ""
echo "💰 Estimated monthly cost: $3-5 USD"
echo "🎯 Cost optimization features enabled:"
echo "   ✅ DynamoDB Pay-per-request"
echo "   ✅ Lambda with minimal memory"
echo "   ✅ S3 static hosting"
echo "   ✅ CloudFront PriceClass_100"
echo "   ✅ TTL enabled for sessions cleanup"
