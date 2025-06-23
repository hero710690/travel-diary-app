#!/bin/bash

# Fix Lambda ResourceConflictException
# Use this script when Lambda is stuck in updating state

set -e

AWS_REGION="ap-northeast-1"
FUNCTION_NAME="travel-diary-prod-backend"

echo "🔧 Fixing Lambda ResourceConflictException"
echo "=========================================="

# Function to check Lambda status
check_lambda_status() {
  echo "🔍 Checking Lambda function status..."
  
  STATE=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION --query 'Configuration.State' --output text 2>/dev/null || echo "NotFound")
  LAST_UPDATE_STATUS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION --query 'Configuration.LastUpdateStatus' --output text 2>/dev/null || echo "NotFound")
  
  echo "📊 Current Status:"
  echo "  State: $STATE"
  echo "  LastUpdateStatus: $LAST_UPDATE_STATUS"
  
  return 0
}

# Function to wait for Lambda to be ready
wait_for_lambda_ready() {
  local max_attempts=60  # 10 minutes max
  local attempt=1
  
  echo "⏳ Waiting for Lambda function to be ready..."
  
  while [ $attempt -le $max_attempts ]; do
    STATE=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION --query 'Configuration.State' --output text 2>/dev/null || echo "NotFound")
    LAST_UPDATE_STATUS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION --query 'Configuration.LastUpdateStatus' --output text 2>/dev/null || echo "NotFound")
    
    echo "⏳ Attempt $attempt/$max_attempts - State: $STATE, LastUpdateStatus: $LAST_UPDATE_STATUS"
    
    if [ "$STATE" = "Active" ] && [ "$LAST_UPDATE_STATUS" = "Successful" ]; then
      echo "✅ Lambda function is ready!"
      return 0
    elif [ "$STATE" = "Failed" ] || [ "$LAST_UPDATE_STATUS" = "Failed" ]; then
      echo "❌ Lambda function is in failed state"
      echo "🔧 You may need to recreate the function"
      return 1
    fi
    
    echo "⏳ Still updating, waiting 10 seconds..."
    sleep 10
    attempt=$((attempt + 1))
  done
  
  echo "❌ Timeout waiting for Lambda function to be ready"
  echo "🔧 Possible solutions:"
  echo "  1. Wait longer - some updates can take 15+ minutes"
  echo "  2. Cancel the deployment and try again later"
  echo "  3. Delete and recreate the Lambda function"
  return 1
}

# Function to force reset Lambda (if needed)
force_reset_lambda() {
  echo "⚠️ WARNING: This will delete and recreate the Lambda function"
  echo "All current code and configuration will be lost!"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    return 1
  fi
  
  echo "🗑️ Deleting Lambda function..."
  aws lambda delete-function --function-name $FUNCTION_NAME --region $AWS_REGION
  
  echo "✅ Lambda function deleted"
  echo "💡 You can now run your deployment again to recreate it"
}

# Main execution
echo "🚀 Starting Lambda conflict resolution..."

# Check current status
check_lambda_status

# Ask user what to do
echo ""
echo "🤔 What would you like to do?"
echo "1. Wait for current update to complete (recommended)"
echo "2. Check status only"
echo "3. Force reset (delete and recreate) - DESTRUCTIVE"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo "⏳ Waiting for Lambda to be ready..."
    if wait_for_lambda_ready; then
      echo "🎉 Lambda is ready! You can now run your deployment."
    else
      echo "❌ Lambda is still not ready. Consider option 3 if this persists."
    fi
    ;;
  2)
    check_lambda_status
    echo "💡 Run this script again with option 1 to wait for completion"
    ;;
  3)
    force_reset_lambda
    ;;
  *)
    echo "❌ Invalid choice. Please run the script again."
    exit 1
    ;;
esac

echo ""
echo "🎯 Next Steps:"
echo "  - If Lambda is ready: Push your code to trigger deployment"
echo "  - If Lambda is still updating: Wait a bit longer"
echo "  - If Lambda failed: Consider recreating it"
echo ""
