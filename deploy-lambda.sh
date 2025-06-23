#!/bin/bash

# Travel Diary App Lambda Deployment Script
set -e

# Configuration
AWS_REGION=${AWS_REGION:-ap-northeast-1}
PROJECT_NAME=${PROJECT_NAME:-travel-diary}
ENVIRONMENT=${ENVIRONMENT:-prod}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "Node.js/npm is not installed."
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured."
        exit 1
    fi
    
    log_success "Prerequisites check passed!"
}

# Build Lambda package
build_lambda_package() {
    log_info "Building Lambda deployment package..."
    
    # Check for pip/pip3
    if command -v pip3 &> /dev/null; then
        PIP_CMD="pip3"
    elif command -v pip &> /dev/null; then
        PIP_CMD="pip"
    else
        log_error "Neither pip nor pip3 found. Please install Python pip."
        exit 1
    fi
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    log_info "Using temporary directory: $TEMP_DIR"
    
    # Copy backend code
    cp -r python-backend/* $TEMP_DIR/
    
    # Install dependencies
    cd $TEMP_DIR
    log_info "Installing Python dependencies with $PIP_CMD..."
    $PIP_CMD install -r requirements-lambda.txt -t . --no-deps --platform linux_x86_64 --only-binary=:all:
    
    # Create deployment package
    log_info "Creating deployment package..."
    zip -r backend.zip . -x "*.pyc" "__pycache__/*" "*.git*" "tests/*" "*.DS_Store"
    
    # Move to infrastructure directory
    mkdir -p ../travel-diary-app/infrastructure-lambda/
    mv backend.zip ../travel-diary-app/infrastructure-lambda/
    
    cd - > /dev/null
    rm -rf $TEMP_DIR
    
    log_success "Lambda package built successfully!"
}

# Build and upload frontend
build_and_upload_frontend() {
    log_info "Building and uploading frontend..."
    
    # Build React app
    cd client
    npm install
    npm run build
    cd ..
    
    # Get S3 bucket name from Terraform
    cd infrastructure-lambda
    S3_BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
    cd ..
    
    if [ -n "$S3_BUCKET" ]; then
        # Upload to S3
        aws s3 sync client/build/ s3://$S3_BUCKET --delete --region $AWS_REGION
        log_success "Frontend uploaded to S3!"
    else
        log_warning "S3 bucket not found, will upload after infrastructure deployment"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying serverless infrastructure..."
    
    cd infrastructure-lambda
    
    # Initialize Terraform
    terraform init
    
    # Create terraform.tfvars file
    cat > terraform.tfvars << EOF
aws_region = "$AWS_REGION"
project_name = "$PROJECT_NAME"
environment = "$ENVIRONMENT"
jwt_secret_key = "$JWT_SECRET_KEY"
google_maps_api_key = "$GOOGLE_MAPS_API_KEY"
EOF
    
    # Plan and apply
    terraform plan -var-file="terraform.tfvars" -out=tfplan
    terraform apply tfplan
    
    cd ..
    
    log_success "Infrastructure deployed successfully!"
}

# Update Lambda function
update_lambda() {
    log_info "Updating Lambda function..."
    
    if [ -f "infrastructure-lambda/backend.zip" ]; then
        aws lambda update-function-code \
            --function-name $PROJECT_NAME-$ENVIRONMENT-backend \
            --zip-file fileb://infrastructure-lambda/backend.zip \
            --region $AWS_REGION
        
        log_success "Lambda function updated!"
    else
        log_error "Lambda package not found!"
        exit 1
    fi
}

# Invalidate CloudFront
invalidate_cloudfront() {
    log_info "Invalidating CloudFront cache..."
    
    cd infrastructure-lambda
    DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    cd ..
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" \
            --region $AWS_REGION > /dev/null
        
        log_success "CloudFront cache invalidated!"
    fi
}

# Get application URL
get_application_url() {
    log_info "Getting application URL..."
    
    cd infrastructure-lambda
    APPLICATION_URL=$(terraform output -raw application_url 2>/dev/null || echo "")
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    cd ..
    
    log_success "🎉 Serverless deployment completed!"
    log_success "🌐 Application URL: $APPLICATION_URL"
    log_info "🔗 API Gateway URL: $API_URL"
    log_info ""
    log_info "📋 Architecture:"
    log_info "  Frontend: CloudFront + S3 (Static hosting)"
    log_info "  Backend: API Gateway + Lambda"
    log_info "  Database: DynamoDB"
    log_info ""
    log_info "💰 Cost Benefits:"
    log_info "  - Pay only for actual requests"
    log_info "  - No idle server costs"
    log_info "  - Auto-scaling from 0 to thousands"
}

# Main deployment function
main() {
    log_info "🚀 Starting Travel Diary Serverless Deployment..."
    log_info "📍 Region: $AWS_REGION"
    log_info "📦 Project: $PROJECT_NAME"
    log_info "🏷️  Environment: $ENVIRONMENT"
    log_info "🔑 AWS Account: $AWS_ACCOUNT_ID"
    echo ""
    
    check_prerequisites
    build_lambda_package
    deploy_infrastructure
    build_and_upload_frontend
    invalidate_cloudfront
    get_application_url
    
    log_success "🎉 Serverless deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build-lambda")
        check_prerequisites
        build_lambda_package
        ;;
    "build-frontend")
        build_and_upload_frontend
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "update-lambda")
        build_lambda_package
        update_lambda
        ;;
    "update-frontend")
        build_and_upload_frontend
        invalidate_cloudfront
        ;;
    "destroy")
        log_warning "⚠️  Destroying serverless infrastructure..."
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd infrastructure-lambda
            terraform destroy -auto-approve
            cd ..
            log_success "Infrastructure destroyed!"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|build-lambda|build-frontend|infrastructure|update-lambda|update-frontend|destroy}"
        echo ""
        echo "Commands:"
        echo "  deploy         - Full serverless deployment"
        echo "  build-lambda   - Build Lambda package only"
        echo "  build-frontend - Build and upload frontend only"
        echo "  infrastructure - Deploy infrastructure only"
        echo "  update-lambda  - Update Lambda function code"
        echo "  update-frontend- Update frontend and invalidate cache"
        echo "  destroy        - Destroy all infrastructure"
        exit 1
        ;;
esac
