#!/bin/bash

# Deploy Collaboration and Sharing Fixes for Travel Diary App
# This script updates the Lambda function and deploys frontend changes

set -e

echo "🚀 Deploying collaboration and sharing fixes..."

# Configuration
LAMBDA_FUNCTION_NAME="travel-diary-prod-lambda-serverless"
REGION="ap-northeast-1"
S3_BUCKET="travel-diary-prod-frontend-serverless"
CLOUDFRONT_DISTRIBUTION_ID="E1JD48IT5LNOGJ"

echo "🔧 Step 1: Preparing Lambda deployment package..."

# Create deployment directory
mkdir -p python-backend/deployment
cd python-backend/deployment

# Copy the updated handler (existing one with email integration)
cp ../working_complete_handler.py lambda_function.py

# Create deployment package
echo "📦 Creating deployment package..."
zip -r ../lambda-deployment.zip . -x "*.pyc" "__pycache__/*"

cd ../..

echo "☁️  Step 2: Updating Lambda function..."

# Update Lambda function code
aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file fileb://python-backend/lambda-deployment.zip \
    --region "$REGION"

# Update environment variables for email service
aws lambda update-function-configuration \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --environment Variables="{
        USERS_TABLE=travel-diary-prod-users-serverless,
        TRIPS_TABLE=travel-diary-prod-trips-serverless,
        SESSIONS_TABLE=travel-diary-prod-sessions-serverless,
        FROM_EMAIL=noreply@yourdomain.com,
        APP_URL=https://d16hcqzmptnoh8.cloudfront.net,
        AWS_REGION=$REGION
    }" \
    --region "$REGION"

echo "🎨 Step 3: Building and deploying frontend..."

# Build frontend
cd client
npm run build

# Upload to S3
aws s3 sync build/ s3://$S3_BUCKET/ --delete

# Create CloudFront invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "🔄 CloudFront invalidation created: $INVALIDATION_ID"

cd ..

echo "🧪 Step 4: Testing the deployment..."

# Test health endpoint
echo "Testing API health..."
curl -s "https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/health" | jq '.'

# Test frontend
echo "Testing frontend..."
curl -s -I "https://d16hcqzmptnoh8.cloudfront.net" | head -1

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 What was deployed:"
echo "• Updated existing Lambda function with email service integration"
echo "• New frontend components for sharing and collaboration"
echo "• Fixed shared trip page with password protection"
echo "• Invite response pages for accepting/declining invitations"
echo "• Email functionality integrated into existing handler"
echo ""
echo "🔗 URLs:"
echo "• Frontend: https://d16hcqzmptnoh8.cloudfront.net"
echo "• API: https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod"
echo "• SES Console: https://console.aws.amazon.com/ses/home?region=$REGION"
echo ""
echo "📧 Next steps for email functionality:"
echo "1. Run ./setup-ses.sh to configure SES templates and policies"
echo "2. Verify your email address in SES console"
echo "3. If using custom domain, verify domain in SES"
echo "4. Request production access if needed (SES starts in sandbox mode)"
echo "5. Update FROM_EMAIL environment variable with your verified email"

# Cleanup
rm -f python-backend/lambda-deployment.zip
rm -rf python-backend/deployment
