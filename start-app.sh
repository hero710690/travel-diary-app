#!/bin/bash

echo "🚀 Starting Travel Diary App..."

# Check if MongoDB is running
if ! docker ps | grep -q "travel-diary-mongo"; then
    echo "📦 Starting MongoDB container..."
    docker start travel-diary-mongo || docker run -d --name travel-diary-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password -e MONGO_INITDB_DATABASE=travel-diary mongo:6.0
fi

# Start backend server
echo "🔧 Starting backend server..."
cd server
nohup node index.js > server.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd ../client
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "=== 🎯 TRAVEL DIARY APP STATUS ==="
echo "Backend API: http://localhost:5001"
curl -s http://localhost:5001/api/health > /dev/null && echo "✅ Backend is running" || echo "❌ Backend failed to start"

echo "Frontend App: http://localhost:3000"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is running" || echo "❌ Frontend failed to start"

echo ""
echo "🌐 Open your browser and go to: http://localhost:3000"
echo "📚 API Documentation: http://localhost:5001/api/health"
echo ""
echo "To stop the app, run: ./stop-app.sh"
