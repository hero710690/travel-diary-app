#!/bin/bash

echo "🚀 Travel Diary App - Deployment Verification"
echo "============================================="

# Frontend URL
FRONTEND_URL="http://travel-diary-prod-frontend.s3-website-ap-northeast-1.amazonaws.com"

# API URL (from the frontend code)
API_URL="https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/health"

echo ""
echo "📱 Testing Frontend Deployment..."
echo "URL: $FRONTEND_URL"

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend: ONLINE (Status: $FRONTEND_STATUS)"
else
    echo "❌ Frontend: OFFLINE (Status: $FRONTEND_STATUS)"
fi

echo ""
echo "🔌 Testing Backend API..."
echo "URL: $API_URL"

API_RESPONSE=$(curl -s "$API_URL")
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$API_STATUS" = "200" ]; then
    echo "✅ Backend API: ONLINE (Status: $API_STATUS)"
    echo "📊 API Response:"
    echo "$API_RESPONSE" | jq '.' 2>/dev/null || echo "$API_RESPONSE"
else
    echo "❌ Backend API: OFFLINE (Status: $API_STATUS)"
fi

echo ""
echo "🗄️  Testing Database Tables..."
aws dynamodb describe-table --table-name travel-diary-prod-users-serverless --query 'Table.{Name:TableName,Status:TableStatus,Items:ItemCount}' --output table 2>/dev/null
aws dynamodb describe-table --table-name travel-diary-prod-trips-serverless --query 'Table.{Name:TableName,Status:TableStatus,Items:ItemCount}' --output table 2>/dev/null
aws dynamodb describe-table --table-name travel-diary-prod-sessions-serverless --query 'Table.{Name:TableName,Status:TableStatus,Items:ItemCount}' --output table 2>/dev/null

echo ""
echo "💰 Estimated Monthly Costs:"
echo "  • Lambda (1M requests): ~$0.20"
echo "  • API Gateway (1M requests): ~$3.50"
echo "  • DynamoDB (pay-per-request): ~$1.25"
echo "  • S3 Storage + Transfer: ~$0.50"
echo "  • Total: ~$5.45/month"

echo ""
echo "🌐 Access Your App:"
echo "Frontend: $FRONTEND_URL"
echo "API Health: $API_URL"

echo ""
if [ "$FRONTEND_STATUS" = "200" ] && [ "$API_STATUS" = "200" ]; then
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "Your Travel Diary app is fully deployed and operational."
else
    echo "⚠️  DEPLOYMENT ISSUES DETECTED"
    echo "Some components may need attention."
fi
