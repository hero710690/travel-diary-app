#!/bin/bash
set -e

echo "=== Deploying Travel Diary Frontend to Firebase Hosting ==="

# Step 1: Build the frontend
echo "Building frontend..."
cd client

if [ -f .env.gcp ]; then
    cp .env.production .env.production.bak 2>/dev/null || true
    cp .env.gcp .env.production
fi

npm run build

if [ -f .env.production.bak ]; then
    mv .env.production.bak .env.production
fi

cd ..

# Step 2: Deploy to Firebase Hosting
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting:trip-diary --project jean-project-492204

echo ""
echo "=== Deployment Complete ==="
