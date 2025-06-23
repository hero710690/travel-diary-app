#!/bin/bash

# Build Lambda package using Docker (more reliable)
set -e

echo "🐳 Building Lambda package with Docker..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy backend code
cp -r python-backend/* $TEMP_DIR/

# Create Dockerfile for Lambda build
cat > $TEMP_DIR/Dockerfile << 'EOF'
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies including zip
RUN yum update -y && yum install -y gcc zip

# Copy requirements and install dependencies
COPY requirements-lambda.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements-lambda.txt -t /tmp/lambda-package --no-cache-dir

# Copy application code
COPY . /tmp/lambda-package/

# Remove unnecessary files
WORKDIR /tmp/lambda-package
RUN find . -type d -name "__pycache__" -exec rm -rf {} + || true
RUN find . -name "*.pyc" -delete || true
RUN rm -rf tests/ || true
RUN rm -f Dockerfile requirements-lambda.txt || true

# Create deployment package
RUN zip -r /tmp/backend.zip . -q

CMD ["cp", "/tmp/backend.zip", "/output/"]
EOF

# Ensure output directory exists
mkdir -p infrastructure-lambda

# Build Docker image and extract package
echo "Building Docker image..."
docker build -t lambda-builder $TEMP_DIR

echo "Extracting Lambda package..."
docker run --rm -v $(pwd)/infrastructure-lambda:/output lambda-builder cp /tmp/backend.zip /output/

# Cleanup
rm -rf $TEMP_DIR
docker rmi lambda-builder

echo "✅ Lambda package built successfully with Docker!"
echo "📦 Package size:"
ls -lh infrastructure-lambda/backend.zip
