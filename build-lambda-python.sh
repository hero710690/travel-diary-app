#!/bin/bash

# Build Lambda package using Python (no zip command needed)
set -e

echo "🐍 Building Lambda package with Python zipfile..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy backend code
cp -r python-backend/* $TEMP_DIR/

# Create Dockerfile for Lambda build
cat > $TEMP_DIR/Dockerfile << 'EOF'
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies
RUN yum update -y && yum install -y gcc

# Copy requirements and install dependencies
COPY requirements-lambda.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements-lambda.txt -t /tmp/lambda-package --no-cache-dir

# Copy application code
COPY . /tmp/lambda-package/

# Remove unnecessary files and create zip using Python
WORKDIR /tmp/lambda-package
RUN find . -type d -name "__pycache__" -exec rm -rf {} + || true
RUN find . -name "*.pyc" -delete || true
RUN rm -rf tests/ || true
RUN rm -f Dockerfile requirements-lambda.txt || true

# Create deployment package using Python
RUN python3 -c "
import zipfile
import os
import sys

def create_zip(source_dir, zip_path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f'Created {zip_path}')

create_zip('.', '/tmp/backend.zip')
"

CMD ["cp", "/tmp/backend.zip", "/output/"]
EOF

# Ensure output directory exists
mkdir -p infrastructure-lambda

# Build Docker image and extract package
echo "Building Docker image..."
docker build -t lambda-builder-python $TEMP_DIR

echo "Extracting Lambda package..."
docker run --rm -v $(pwd)/infrastructure-lambda:/output lambda-builder-python cp /tmp/backend.zip /output/

# Cleanup
rm -rf $TEMP_DIR
docker rmi lambda-builder-python

echo "✅ Lambda package built successfully with Python!"
echo "📦 Package size:"
ls -lh infrastructure-lambda/backend.zip
