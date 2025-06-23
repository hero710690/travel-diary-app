#!/bin/bash

# Verify CloudFront Configuration for Travel Diary App

set -e

AWS_REGION="ap-northeast-1"
CLOUDFRONT_COMMENT="Travel Diary App CDN - prod"
S3_BUCKET="travel-diary-prod-frontend"

echo "🔍 Verifying CloudFront Configuration"
echo "===================================="

# Get CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Comment==`'"$CLOUDFRONT_COMMENT"'`].Id' \
  --output text)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
  echo "❌ CloudFront distribution not found!"
  echo "Please run ./deploy-manual-infrastructure.sh first"
  exit 1
fi

echo "✅ CloudFront Distribution ID: $DISTRIBUTION_ID"

# Get distribution details
DISTRIBUTION_DETAILS=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID)

# Extract domain name
DOMAIN_NAME=$(echo $DISTRIBUTION_DETAILS | jq -r '.Distribution.DomainName')
echo "🌐 CloudFront Domain: https://$DOMAIN_NAME"

# Check origins
echo ""
echo "📍 Checking Origins:"
echo $DISTRIBUTION_DETAILS | jq -r '.Distribution.DistributionConfig.Origins.Items[] | "- " + .Id + ": " + .DomainName'

# Check cache behaviors
echo ""
echo "🔄 Checking Cache Behaviors:"
echo $DISTRIBUTION_DETAILS | jq -r '.Distribution.DistributionConfig.CacheBehaviors.Items[]? | "- " + .PathPattern + " -> " + .TargetOriginId'

# Test S3 connection
echo ""
echo "🪣 Testing S3 Connection:"
if aws s3 ls s3://$S3_BUCKET --region $AWS_REGION > /dev/null 2>&1; then
  echo "✅ S3 bucket accessible"
else
  echo "❌ S3 bucket not accessible"
fi

# Test API Gateway connection
echo ""
echo "🔗 Testing API Gateway Connection:"
API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`travel-diary-prod-api`].id' --output text)
if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
  echo "✅ API Gateway found: $API_ID"
  API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"
  echo "🔗 API URL: $API_URL"
else
  echo "❌ API Gateway not found"
fi

# Test CloudFront endpoints
echo ""
echo "🧪 Testing CloudFront Endpoints:"

# Test frontend
echo "Testing frontend (should return HTML)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN_NAME)
if [ "$FRONTEND_STATUS" == "200" ]; then
  echo "✅ Frontend accessible (HTTP $FRONTEND_STATUS)"
else
  echo "⚠️ Frontend returned HTTP $FRONTEND_STATUS"
fi

# Test API through CloudFront
echo "Testing API through CloudFront..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN_NAME/api/v1/auth/health)
if [ "$API_STATUS" == "200" ]; then
  echo "✅ API accessible through CloudFront (HTTP $API_STATUS)"
else
  echo "⚠️ API through CloudFront returned HTTP $API_STATUS"
fi

echo ""
echo "🎯 Summary:"
echo "- CloudFront Distribution: ✅ $DISTRIBUTION_ID"
echo "- Frontend URL: https://$DOMAIN_NAME"
echo "- API URL: https://$DOMAIN_NAME/api/v1/"
echo ""
echo "💡 If API is not working through CloudFront:"
echo "1. Check that API Gateway is deployed"
echo "2. Verify CloudFront cache behavior for /api/*"
echo "3. Check CORS settings in your Lambda function"
echo ""
