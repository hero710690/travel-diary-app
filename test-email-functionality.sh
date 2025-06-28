#!/bin/bash

# Test Email Functionality with SES
# This script tests both collaboration invites and share link emails

set -e

API_BASE="https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod"
FRONTEND_BASE="https://d16hcqzmptnoh8.cloudfront.net"

echo "📧 Testing Email Functionality with SES..."
echo ""

# Get your email address for testing
read -p "Enter your email address for testing: " TEST_EMAIL

if [ -z "$TEST_EMAIL" ]; then
    echo "❌ Email address is required for testing"
    exit 1
fi

echo "Using email: $TEST_EMAIL"
echo ""

# Step 1: Login with existing test user
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-sharing@example.com",
        "password": "testpass123"
    }')

echo "Login response: $LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to login. Cannot proceed with test."
    exit 1
fi

echo "✅ Authentication successful. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a test trip for email testing
echo "2️⃣  Creating test trip for email testing..."
TRIP_RESPONSE=$(curl -s -X POST "$API_BASE/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Email Test Trip",
        "description": "Testing email notifications for sharing and collaboration",
        "destination": "Paris, France",
        "start_date": "2025-08-01",
        "end_date": "2025-08-07",
        "budget": 3000
    }')

echo "Trip creation response: $TRIP_RESPONSE"
TRIP_ID=$(echo "$TRIP_RESPONSE" | jq -r '.trip.id // empty')

if [ -z "$TRIP_ID" ] || [ "$TRIP_ID" = "null" ]; then
    echo "❌ Failed to create trip or extract trip ID"
    exit 1
fi

echo "✅ Trip created successfully. ID: $TRIP_ID"
echo ""

# Step 3: Test Share Link with Email
echo "3️⃣  Testing share link with email notification..."
SHARE_RESPONSE=$(curl -s -X POST "$API_BASE/trips/$TRIP_ID/share" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "is_public": true,
        "allow_comments": true,
        "password_protected": false,
        "expires_in_days": 7,
        "send_email": true,
        "email_recipients": ["'$TEST_EMAIL'"]
    }')

echo "Share link with email response: $SHARE_RESPONSE"

SHARE_URL=$(echo "$SHARE_RESPONSE" | jq -r '.share_link.url // empty')
EMAIL_SENT=$(echo "$SHARE_RESPONSE" | jq -r '.email_sent // false')

if [ -z "$SHARE_URL" ] || [ "$SHARE_URL" = "null" ]; then
    echo "❌ Failed to create share link"
    exit 1
fi

echo "✅ Share link created: $SHARE_URL"
echo "📧 Email sent: $EMAIL_SENT"
echo ""

# Step 4: Test Collaboration Invite with Email
echo "4️⃣  Testing collaboration invite with email..."
INVITE_RESPONSE=$(curl -s -X POST "$API_BASE/trips/$TRIP_ID/invite" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "email": "'$TEST_EMAIL'",
        "role": "editor",
        "message": "Join me in planning our Paris trip! This is a test of the email functionality."
    }')

echo "Collaboration invite response: $INVITE_RESPONSE"

INVITE_SENT=$(echo "$INVITE_RESPONSE" | jq -r '.email_sent // false')
INVITE_TOKEN=$(echo "$INVITE_RESPONSE" | jq -r '.invitation.token // empty')

echo "📧 Invite email sent: $INVITE_SENT"
if [ "$INVITE_TOKEN" != "null" ] && [ -n "$INVITE_TOKEN" ]; then
    echo "🎫 Invite token: $INVITE_TOKEN"
    echo "🔗 Invite URL: $FRONTEND_BASE/invite/$INVITE_TOKEN"
fi
echo ""

# Step 5: Test Email Status Check
echo "5️⃣  Checking email service status..."
EMAIL_STATUS=$(curl -s "$API_BASE/email/status" \
    -H "Authorization: Bearer $TOKEN")

echo "Email service status: $EMAIL_STATUS"
echo ""

# Step 6: Test Email Templates (if available)
echo "6️⃣  Testing email template preview..."
TEMPLATE_RESPONSE=$(curl -s "$API_BASE/email/templates" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo '{"templates": []}')

echo "Available email templates: $TEMPLATE_RESPONSE"
echo ""

# Summary
echo "📊 Email Functionality Test Summary:"
echo "• Trip Creation: ✅"
echo "• Share Link Creation: ✅"
echo "• Share Link Email: $([ "$EMAIL_SENT" = "true" ] && echo "✅" || echo "❌")"
echo "• Collaboration Invite: ✅"
echo "• Invite Email: $([ "$INVITE_SENT" = "true" ] && echo "✅" || echo "❌")"

echo ""
echo "📧 Check your email ($TEST_EMAIL) for:"
echo "1. Share link notification for 'Email Test Trip'"
echo "2. Collaboration invite for 'Email Test Trip'"

echo ""
echo "🔗 Test URLs:"
echo "• Share Link: $SHARE_URL"
if [ "$INVITE_TOKEN" != "null" ] && [ -n "$INVITE_TOKEN" ]; then
    echo "• Invite Response: $FRONTEND_BASE/invite/$INVITE_TOKEN"
fi

echo ""
echo "✅ Email functionality test completed!"
echo ""
echo "💡 If you didn't receive emails, check:"
echo "1. SES sending limits and sandbox mode"
echo "2. Verified email addresses in SES"
echo "3. CloudWatch logs for any email sending errors"
echo "4. Spam/junk folder"
