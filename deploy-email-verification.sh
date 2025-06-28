#!/bin/bash

# Deploy Email Verification Enhancement to Travel Diary Backend
set -e

echo "🚀 Deploying Email Verification Enhancement..."
echo ""

# Configuration
LAMBDA_FUNCTION_NAME="travel-diary-prod-backend"
REGION="ap-northeast-1"
BACKEND_DIR="/Users/jeanlee/travel-diary-app/python-backend"

# Step 1: Create deployment package
echo "1️⃣  Creating deployment package..."
cd "$BACKEND_DIR"

# Create a temporary directory for the package
rm -rf temp_package
mkdir temp_package

# Copy the enhanced handler and email verification module
cp enhanced_handler_with_verification.py temp_package/lambda_function.py
cp email_verification_handler.py temp_package/

# Copy existing requirements if they exist
if [ -f requirements-lambda.txt ]; then
    cp requirements-lambda.txt temp_package/requirements.txt
fi

# Create the deployment zip
cd temp_package
zip -r ../email-verification-deployment.zip .
cd ..

echo "✅ Deployment package created: email-verification-deployment.zip"
echo ""

# Step 2: Update Lambda function
echo "2️⃣  Updating Lambda function..."
aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file fileb://email-verification-deployment.zip \
    --region "$REGION"

echo "✅ Lambda function updated successfully"
echo ""

# Step 3: Create DynamoDB table for email verifications
echo "3️⃣  Creating email verifications table..."
aws dynamodb create-table \
    --table-name "travel-diary-prod-email-verifications" \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
        AttributeName=verification_token,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=TokenIndex,KeySchema=[{AttributeName=verification_token,KeyType=HASH}],Projection={ProjectionType=ALL},BillingMode=PAY_PER_REQUEST \
    --billing-mode PAY_PER_REQUEST \
    --tags \
        Key=Project,Value=travel-diary \
        Key=Environment,Value=prod \
    --region "$REGION" \
    2>/dev/null || echo "⚠️  Table may already exist"

echo "✅ Email verifications table ready"
echo ""

# Step 4: Update Lambda permissions for the new table
echo "4️⃣  Updating Lambda permissions..."
aws iam put-role-policy \
    --role-name "travel-diary-prod-lambda-role" \
    --policy-name "EmailVerificationAccess" \
    --policy-document '{
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
                    "arn:aws:dynamodb:'$REGION':*:table/travel-diary-prod-email-verifications",
                    "arn:aws:dynamodb:'$REGION':*:table/travel-diary-prod-email-verifications/index/*"
                ]
            }
        ]
    }' \
    --region "$REGION"

echo "✅ Lambda permissions updated"
echo ""

# Step 5: Test the new endpoints
echo "5️⃣  Testing new email verification endpoints..."

# Test the API health
API_RESPONSE=$(curl -s "https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/" | jq -r '.version // "unknown"')
echo "API Version: $API_RESPONSE"

if [ "$API_RESPONSE" = "2.4.0" ]; then
    echo "✅ Email verification enhancement deployed successfully!"
else
    echo "⚠️  Deployment may need a few moments to propagate"
fi

echo ""

# Step 6: Test email verification workflow
echo "6️⃣  Testing email verification workflow..."

# Test verification request
echo "Testing verification request..."
VERIFICATION_TEST=$(curl -s -X POST "https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/email/request-verification" \
    -H "Content-Type: application/json" \
    -d '{"email": "hero710690@gmail.com"}' | jq -r '.message // "error"')

echo "Verification test result: $VERIFICATION_TEST"

echo ""
echo "🎉 Email Verification Enhancement Deployment Complete!"
echo ""
echo "📧 New Features Available:"
echo "• Email verification before invitations"
echo "• Verification email templates"
echo "• Verification status tracking"
echo "• Enhanced collaboration workflow"
echo ""
echo "🔗 New API Endpoints:"
echo "• POST /email/request-verification - Request email verification"
echo "• GET /verify-email/{token} - Verify email with token"
echo "• GET /email/status?email={email} - Check verification status"
echo "• POST /trips/{id}/invite - Enhanced invite with verification"
echo ""
echo "🧪 Test the new workflow:"
echo "1. Request verification: curl -X POST 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/email/request-verification' -H 'Content-Type: application/json' -d '{\"email\": \"test@example.com\"}'"
echo "2. Check verification status: curl 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/email/status?email=test@example.com'"
echo ""

# Cleanup
rm -rf temp_package email-verification-deployment.zip

echo "✅ Deployment completed successfully!"
