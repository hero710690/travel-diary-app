#!/bin/bash

# Manual Infrastructure Deployment Script
# Deploy CDN (CloudFront) and DynamoDB manually

set -e

# Configuration
AWS_REGION="ap-northeast-1"
PROJECT_NAME="travel-diary"
ENVIRONMENT="prod"
S3_BUCKET_NAME="travel-diary-prod-frontend"

echo "🏗️ Deploying Travel Diary Manual Infrastructure"
echo "================================================"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"
echo "📍 Region: $AWS_REGION"
echo "🏷️ Project: $PROJECT_NAME-$ENVIRONMENT"
echo ""

# 1. Create DynamoDB Tables
echo "1️⃣ Creating DynamoDB Tables..."
echo "================================"

# Users Table
echo "Creating Users table..."
aws dynamodb create-table \
    --table-name travel-diary-prod-users-serverless \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=email,AttributeType=S \
        AttributeName=username,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
        IndexName=username-index,KeySchema=[{AttributeName=username,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION \
    --tags Key=Name,Value=travel-diary-prod-users-table-serverless Key=Environment,Value=prod Key=Project,Value=travel-diary \
    2>/dev/null || echo "Users table already exists"

# Trips Table
echo "Creating Trips table..."
aws dynamodb create-table \
    --table-name travel-diary-prod-trips-serverless \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
        AttributeName=status,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=user-trips-index,KeySchema=[{AttributeName=user_id,KeyType=HASH},{AttributeName=status,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION \
    --tags Key=Name,Value=travel-diary-prod-trips-table-serverless Key=Environment,Value=prod Key=Project,Value=travel-diary \
    2>/dev/null || echo "Trips table already exists"

# Sessions Table
echo "Creating Sessions table..."
aws dynamodb create-table \
    --table-name travel-diary-prod-sessions-serverless \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=user-sessions-index,KeySchema=[{AttributeName=user_id,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION \
    --tags Key=Name,Value=travel-diary-prod-sessions-table-serverless Key=Environment,Value=prod Key=Project,Value=travel-diary \
    2>/dev/null || echo "Sessions table already exists"

# Enable TTL on Sessions table
echo "Enabling TTL on Sessions table..."
aws dynamodb update-time-to-live \
    --table-name travel-diary-prod-sessions-serverless \
    --time-to-live-specification Enabled=true,AttributeName=expires_at \
    --region $AWS_REGION \
    2>/dev/null || echo "TTL already enabled or failed to enable"

echo "✅ DynamoDB tables created/verified"
echo ""

# 2. Create S3 Bucket
echo "2️⃣ Creating S3 Bucket..."
echo "========================="

# Create S3 bucket
aws s3 mb s3://$S3_BUCKET_NAME --region $AWS_REGION 2>/dev/null || echo "S3 bucket already exists"

# Configure bucket for static website hosting
aws s3 website s3://$S3_BUCKET_NAME \
    --index-document index.html \
    --error-document index.html \
    --region $AWS_REGION

# Set bucket policy for public read access
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $S3_BUCKET_NAME \
    --policy file:///tmp/bucket-policy.json \
    --region $AWS_REGION

rm /tmp/bucket-policy.json

echo "✅ S3 bucket created and configured"
echo ""

# 3. Create CloudFront Distribution
echo "3️⃣ Creating CloudFront Distribution..."
echo "======================================"

# Create CloudFront distribution configuration
cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "travel-diary-$(date +%s)",
    "Comment": "Travel Diary App CDN - prod",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "travel-diary-prod-s3-origin",
                "DomainName": "$S3_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "travel-diary-prod-s3-origin",
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
        "Quantity": 2,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            },
            {
                "ErrorCode": 403,
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

# Create CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.Id' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"
    
    # Get CloudFront domain name
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
        --id $DISTRIBUTION_ID \
        --query 'Distribution.DomainName' \
        --output text \
        --region $AWS_REGION)
    
    echo "🌐 CloudFront Domain: https://$CLOUDFRONT_DOMAIN"
else
    echo "⚠️ CloudFront distribution creation failed or already exists"
    
    # Try to find existing distribution
    EXISTING_DISTRIBUTION=$(aws cloudfront list-distributions \
        --query 'DistributionList.Items[?Comment==`Travel Diary App CDN - prod`]' \
        --output table)
    
    if [ -n "$EXISTING_DISTRIBUTION" ]; then
        echo "Found existing CloudFront distribution:"
        echo "$EXISTING_DISTRIBUTION"
    fi
fi

rm /tmp/cloudfront-config.json

echo ""
echo "🎉 Manual Infrastructure Deployment Complete!"
echo "============================================="
echo ""
echo "📊 Infrastructure Summary:"
echo "  ✅ DynamoDB Tables:"
echo "    - travel-diary-prod-users-serverless"
echo "    - travel-diary-prod-trips-serverless"
echo "    - travel-diary-prod-sessions-serverless"
echo "  ✅ S3 Bucket: $S3_BUCKET_NAME"
echo "  ✅ CloudFront Distribution: ${DISTRIBUTION_ID:-'Check AWS Console'}"
echo ""
echo "🚀 Next Steps:"
echo "  1. Create Lambda function and API Gateway manually (or use Terraform)"
echo "  2. Configure GitHub Actions secrets"
echo "  3. Push code to trigger automated app deployment"
echo ""
echo "💡 The GitHub Actions workflow will now deploy only:"
echo "  - Lambda function code updates"
echo "  - Frontend builds to S3"
echo "  - CloudFront cache invalidations"
echo ""
