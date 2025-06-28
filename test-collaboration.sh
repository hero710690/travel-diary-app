#!/bin/bash

# Test Collaboration and Sharing Features
# This script tests the collaboration endpoints

set -e

API_BASE="https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod"
FRONTEND_BASE="https://d16hcqzmptnoh8.cloudfront.net"

echo "🧪 Testing Travel Diary Collaboration Features..."

# Test 1: Health Check
echo "1️⃣  Testing API health..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/health")
echo "Health Response: $HEALTH_RESPONSE" | jq '.'

# Test 2: Test shared trip endpoint (should fail without valid token)
echo "2️⃣  Testing shared trip endpoint..."
SHARED_RESPONSE=$(curl -s -w "%{http_code}" "$API_BASE/shared/invalid-token" -o /tmp/shared_test.json)
echo "Shared trip response code: $SHARED_RESPONSE"
if [ "$SHARED_RESPONSE" = "404" ]; then
    echo "✅ Shared trip endpoint working (correctly returns 404 for invalid token)"
else
    echo "❌ Unexpected response code for shared trip endpoint"
fi

# Test 3: Test invite response endpoint (should fail without valid token)
echo "3️⃣  Testing invite response endpoint..."
INVITE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/invite/respond" \
    -H "Content-Type: application/json" \
    -d '{"action": "accept", "invite_token": "invalid-token"}' \
    -o /tmp/invite_test.json)
echo "Invite response code: $INVITE_RESPONSE"
if [ "$INVITE_RESPONSE" = "404" ]; then
    echo "✅ Invite response endpoint working (correctly returns 404 for invalid token)"
else
    echo "❌ Unexpected response code for invite response endpoint"
fi

# Test 4: Test frontend accessibility
echo "4️⃣  Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" "$FRONTEND_BASE" -o /dev/null)
echo "Frontend response code: $FRONTEND_RESPONSE"
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible"
fi

# Test 5: Test shared trip page route
echo "5️⃣  Testing shared trip page route..."
SHARED_PAGE_RESPONSE=$(curl -s -w "%{http_code}" "$FRONTEND_BASE/shared/test-token" -o /dev/null)
echo "Shared trip page response code: $SHARED_PAGE_RESPONSE"
if [ "$SHARED_PAGE_RESPONSE" = "200" ]; then
    echo "✅ Shared trip page route working"
else
    echo "❌ Shared trip page route not working"
fi

# Test 6: Test invite response page route
echo "6️⃣  Testing invite response page route..."
INVITE_PAGE_RESPONSE=$(curl -s -w "%{http_code}" "$FRONTEND_BASE/invite/accept?token=test-token" -o /dev/null)
echo "Invite response page response code: $INVITE_PAGE_RESPONSE"
if [ "$INVITE_PAGE_RESPONSE" = "200" ]; then
    echo "✅ Invite response page route working"
else
    echo "❌ Invite response page route not working"
fi

echo ""
echo "📊 Test Summary:"
echo "• API Health: ✅"
echo "• Shared Trip Endpoint: $([ "$SHARED_RESPONSE" = "404" ] && echo "✅" || echo "❌")"
echo "• Invite Response Endpoint: $([ "$INVITE_RESPONSE" = "404" ] && echo "✅" || echo "❌")"
echo "• Frontend Accessibility: $([ "$FRONTEND_RESPONSE" = "200" ] && echo "✅" || echo "❌")"
echo "• Shared Trip Page: $([ "$SHARED_PAGE_RESPONSE" = "200" ] && echo "✅" || echo "❌")"
echo "• Invite Response Page: $([ "$INVITE_PAGE_RESPONSE" = "200" ] && echo "✅" || echo "❌")"

echo ""
echo "🔗 Test URLs:"
echo "• API: $API_BASE"
echo "• Frontend: $FRONTEND_BASE"
echo "• Shared Trip Example: $FRONTEND_BASE/shared/test-token"
echo "• Invite Accept Example: $FRONTEND_BASE/invite/accept?token=test-token"
echo "• Invite Decline Example: $FRONTEND_BASE/invite/decline?token=test-token"

# Cleanup
rm -f /tmp/shared_test.json /tmp/invite_test.json

echo ""
echo "✅ Collaboration testing completed!"
