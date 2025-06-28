#!/bin/bash

# Complete Email Verification Workflow Test
set -e

echo "🧪 Testing Complete Email Verification Workflow..."
echo ""

API_BASE="https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod"
FRONTEND_BASE="https://d16hcqzmptnoh8.cloudfront.net"

# Test emails
VERIFIED_EMAIL="hero710690@gmail.com"
UNVERIFIED_EMAIL="test-unverified@example.com"

echo "📧 Testing Email Verification System..."
echo ""

# Step 1: Test email verification request for verified email
echo "1️⃣  Testing verification request for verified email..."
VERIFIED_RESPONSE=$(curl -s -X POST "$API_BASE/email/request-verification" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$VERIFIED_EMAIL\"}")

echo "Verified email response: $VERIFIED_RESPONSE"
VERIFIED_EMAIL_SENT=$(echo "$VERIFIED_RESPONSE" | jq -r '.email_sent // false')
echo "Email sent to verified address: $VERIFIED_EMAIL_SENT"
echo ""

# Step 2: Test email verification request for unverified email
echo "2️⃣  Testing verification request for unverified email..."
UNVERIFIED_RESPONSE=$(curl -s -X POST "$API_BASE/email/request-verification" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$UNVERIFIED_EMAIL\"}")

echo "Unverified email response: $UNVERIFIED_RESPONSE"
UNVERIFIED_EMAIL_SENT=$(echo "$UNVERIFIED_RESPONSE" | jq -r '.email_sent // false')
echo "Email sent to unverified address: $UNVERIFIED_EMAIL_SENT"
echo ""

# Step 3: Check verification status
echo "3️⃣  Checking verification status..."
VERIFIED_STATUS=$(curl -s "$API_BASE/email/status?email=$VERIFIED_EMAIL")
UNVERIFIED_STATUS=$(curl -s "$API_BASE/email/status?email=$UNVERIFIED_EMAIL")

echo "Verified email status: $VERIFIED_STATUS"
echo "Unverified email status: $UNVERIFIED_STATUS"
echo ""

# Step 4: Test invalid verification token
echo "4️⃣  Testing invalid verification token..."
INVALID_TOKEN_RESPONSE=$(curl -s "$API_BASE/verify-email/invalid-token-123")
echo "Invalid token response: $INVALID_TOKEN_RESPONSE"
echo ""

# Step 5: Test API health and version
echo "5️⃣  Checking API version and features..."
API_INFO=$(curl -s "$API_BASE/")
API_VERSION=$(echo "$API_INFO" | jq -r '.version // "unknown"')
VERIFICATION_ENABLED=$(echo "$API_INFO" | jq -r '.verification_enabled // false')

echo "API Version: $API_VERSION"
echo "Verification Enabled: $VERIFICATION_ENABLED"
echo ""

# Step 6: Test collaboration invite workflow (if we have auth token)
echo "6️⃣  Testing collaboration workflow..."
echo "Note: This requires authentication. Testing via frontend is recommended."
echo ""

# Summary
echo "📊 Email Verification Test Summary:"
echo "• API Version: $API_VERSION"
echo "• Verification System: $([ "$VERIFICATION_ENABLED" = "true" ] && echo "✅ Active" || echo "❌ Inactive")"
echo "• Verified Email Requests: $([ "$VERIFIED_EMAIL_SENT" = "true" ] && echo "✅ Working" || echo "⚠️  Limited (SES sandbox)")"
echo "• Unverified Email Requests: $([ "$UNVERIFIED_EMAIL_SENT" = "false" ] && echo "✅ Blocked (as expected)" || echo "⚠️  Unexpected behavior")"
echo ""

echo "🔗 Test URLs:"
echo "• Frontend: $FRONTEND_BASE"
echo "• Email Verification API: $API_BASE/email/request-verification"
echo "• Verification Status: $API_BASE/email/status?email=EMAIL"
echo "• Verify Email: $FRONTEND_BASE/verify-email/TOKEN"
echo ""

echo "🧪 Manual Testing Steps:"
echo "1. Go to $FRONTEND_BASE"
echo "2. Login and create/view a trip"
echo "3. Click 'Invite' button"
echo "4. Enter an unverified email address"
echo "5. Should see email verification modal"
echo "6. Check email for verification link"
echo "7. Click verification link"
echo "8. Should see success page"
echo ""

echo "✅ Email verification workflow test completed!"
echo ""

if [ "$API_VERSION" = "2.4.1" ] && [ "$VERIFICATION_ENABLED" = "true" ]; then
    echo "🎉 Email verification system is fully operational!"
else
    echo "⚠️  Email verification system may need attention"
fi
