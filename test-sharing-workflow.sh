#!/bin/bash

# Test Complete Sharing Workflow
# This script demonstrates the full sharing process

set -e

API_BASE="https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod"
FRONTEND_BASE="https://d16hcqzmptnoh8.cloudfront.net"

echo "🧪 Testing Complete Sharing Workflow..."
echo ""

# Step 1: Register a test user
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-sharing@example.com",
        "password": "testpass123",
        "name": "Test User"
    }')

echo "Register response: $REGISTER_RESPONSE"

# Extract token from response
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to register user or extract token"
    echo "Trying to login instead..."
    
    # Try to login if user already exists
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
fi

echo "✅ Authentication successful. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Create a test trip
echo "2️⃣  Creating test trip..."
TRIP_RESPONSE=$(curl -s -X POST "$API_BASE/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Test Sharing Trip",
        "description": "This is a test trip for sharing functionality",
        "destination": "Tokyo, Japan",
        "start_date": "2025-07-01",
        "end_date": "2025-07-07",
        "budget": 2000
    }')

echo "Trip creation response: $TRIP_RESPONSE"

# Extract trip ID
TRIP_ID=$(echo "$TRIP_RESPONSE" | jq -r '.trip.id // empty')

if [ -z "$TRIP_ID" ] || [ "$TRIP_ID" = "null" ]; then
    echo "❌ Failed to create trip or extract trip ID"
    exit 1
fi

echo "✅ Trip created successfully. ID: $TRIP_ID"
echo ""

# Step 3: Create a share link
echo "3️⃣  Creating share link..."
SHARE_RESPONSE=$(curl -s -X POST "$API_BASE/trips/$TRIP_ID/share" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "is_public": true,
        "allow_comments": false,
        "password_protected": false,
        "expires_in_days": 30,
        "send_email": false
    }')

echo "Share link response: $SHARE_RESPONSE"

# Extract share URL
SHARE_URL=$(echo "$SHARE_RESPONSE" | jq -r '.share_link.url // empty')
SHARE_TOKEN=$(echo "$SHARE_RESPONSE" | jq -r '.share_link.token // empty')

if [ -z "$SHARE_URL" ] || [ "$SHARE_URL" = "null" ]; then
    echo "❌ Failed to create share link"
    exit 1
fi

echo "✅ Share link created successfully!"
echo "🔗 Share URL: $SHARE_URL"
echo "🎫 Share Token: $SHARE_TOKEN"
echo ""

# Step 4: Test accessing the shared trip
echo "4️⃣  Testing shared trip access..."
SHARED_TRIP_RESPONSE=$(curl -s "$API_BASE/shared/$SHARE_TOKEN")

echo "Shared trip API response: $SHARED_TRIP_RESPONSE"

# Check if the response contains trip data
if echo "$SHARED_TRIP_RESPONSE" | jq -e '.trip' > /dev/null 2>&1; then
    echo "✅ Shared trip API working correctly!"
    
    TRIP_TITLE=$(echo "$SHARED_TRIP_RESPONSE" | jq -r '.trip.title')
    TRIP_DESTINATION=$(echo "$SHARED_TRIP_RESPONSE" | jq -r '.trip.destination')
    
    echo "📋 Shared Trip Details:"
    echo "   Title: $TRIP_TITLE"
    echo "   Destination: $TRIP_DESTINATION"
else
    echo "❌ Shared trip API not working correctly"
fi

echo ""

# Step 5: Test frontend access
echo "5️⃣  Testing frontend shared trip page..."
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" "$SHARE_URL" -o /tmp/shared_page.html)

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend shared trip page accessible"
    
    # Check if the page contains the trip title
    if grep -q "Test Sharing Trip" /tmp/shared_page.html 2>/dev/null; then
        echo "✅ Trip content loaded correctly on frontend"
    else
        echo "⚠️  Frontend accessible but trip content may not be loading"
    fi
else
    echo "❌ Frontend shared trip page not accessible (HTTP $FRONTEND_RESPONSE)"
fi

echo ""
echo "📊 Test Summary:"
echo "• User Registration/Login: ✅"
echo "• Trip Creation: ✅"
echo "• Share Link Creation: ✅"
echo "• Shared Trip API: $(echo "$SHARED_TRIP_RESPONSE" | jq -e '.trip' > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo "• Frontend Access: $([ "$FRONTEND_RESPONSE" = "200" ] && echo "✅" || echo "❌")"

echo ""
echo "🔗 Working URLs:"
echo "• Share Link: $SHARE_URL"
echo "• API Endpoint: $API_BASE/shared/$SHARE_TOKEN"

# Cleanup
rm -f /tmp/shared_page.html

echo ""
echo "✅ Sharing workflow test completed!"
echo ""
echo "💡 To test manually:"
echo "1. Visit: $SHARE_URL"
echo "2. You should see the shared trip details"
echo "3. The trip should show: 'Test Sharing Trip' to Tokyo, Japan"
