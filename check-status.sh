#!/bin/bash

echo "🎯 TRAVEL DIARY APP - DOCKER STATUS CHECK"
echo "========================================"

echo -e "\n🐳 Docker Containers:"
docker-compose ps

echo -e "\n🔍 Service Health Checks:"

echo "📡 Backend API (http://localhost:5001):"
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is running"
    curl -s http://localhost:5001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5001/api/health
else
    echo "❌ Backend is not responding"
fi

echo -e "\n🌐 Frontend (http://localhost:3000):"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
    echo "Status: $(curl -s -I http://localhost:3000 | head -1)"
else
    echo "❌ Frontend is not responding"
fi

echo -e "\n🗄️  MongoDB:"
if docker exec travel-diary-mongo mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB is not responding"
fi

echo -e "\n🧪 Registration Test:"
RESPONSE=$(curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Status Test User",
    "email": "statustest'$(date +%s)'@example.com",
    "password": "password123"
  }' \
  -s -w "%{http_code}")

HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Registration API is working"
else
    echo "❌ Registration API failed (HTTP: $HTTP_CODE)"
fi

echo -e "\n🎉 ACCESS YOUR APP:"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5001"
echo ""
echo "📝 To stop the app: docker-compose down"
echo "🔄 To restart: docker-compose up -d"
echo "📊 To view logs: docker-compose logs -f"
