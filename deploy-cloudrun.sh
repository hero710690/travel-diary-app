#!/bin/bash
set -e

PROJECT_ID="jean-project-492204"
REGION="asia-northeast1"
SERVICE_NAME="travel-diary-api"
REPO_NAME="travel-diary-backend"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/api:latest"

echo "=== Deploying Travel Diary API to Cloud Run ==="

# Step 1: Build and push Docker image via Cloud Build
echo "Building Docker image..."
cd python-backend
gcloud builds submit --tag "${IMAGE_NAME}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --dockerfile Dockerfile.cloudrun

cd ..

# Step 2: Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --allow-unauthenticated \
    --service-account "travel-diary-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --set-env-vars "DATABASE_TYPE=firestore,GCP_PROJECT_ID=${PROJECT_ID},ENVIRONMENT=production,DEBUG=false,API_V1_STR=/api/v1,PROJECT_NAME=Travel Diary API,VERSION=1.0.0,ALGORITHM=HS256,ACCESS_TOKEN_EXPIRE_MINUTES=30,BACKEND_CORS_ORIGINS=[\"https://trip-diary.web.app\",\"https://trip-diary.firebaseapp.com\"]" \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8080

# Step 3: Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format "value(status.url)")

echo ""
echo "=== Deployment Complete ==="
echo "Service URL: ${SERVICE_URL}"
echo "API Base:    ${SERVICE_URL}/api/v1"
echo "Health:      ${SERVICE_URL}/health"
echo "Docs:        ${SERVICE_URL}/docs"
echo ""
echo "Next: update client/.env.gcp with:"
echo "  REACT_APP_API_URL=${SERVICE_URL}/api/v1"
