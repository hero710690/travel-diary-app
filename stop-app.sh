#!/bin/bash

echo "🛑 Stopping Travel Diary App..."

# Kill backend processes
echo "Stopping backend server..."
pkill -f "node index.js"

# Kill frontend processes  
echo "Stopping frontend server..."
pkill -f "react-scripts start"

# Stop MongoDB container (optional)
read -p "Do you want to stop MongoDB container? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Stopping MongoDB container..."
    docker stop travel-diary-mongo
fi

echo "✅ Travel Diary App stopped successfully!"
