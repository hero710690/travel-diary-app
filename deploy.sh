#!/bin/bash

# Travel Diary App Deployment Script
set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME=${PROJECT_NAME:-travel-diary}
ENVIRONMENT=${ENVIRONMENT:-prod}
JWT_SECRET_KEY=${JWT_SECRET_KEY:-""}
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-""}

# Get AWS Account ID
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
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check JWT secret key
    if [ -z "$JWT_SECRET_KEY" ]; then
        log_error "JWT_SECRET_KEY environment variable is not set."
        log_info "Please set it with: export JWT_SECRET_KEY=\"your-secret-key\""
        exit 1
    fi
    
    log_success "Prerequisites check passed!"
}

# Create ECR repositories if they don't exist
create_ecr_repositories() {
    log_info "Creating ECR repositories if they don't exist..."
    
    # Backend repository
    if ! aws ecr describe-repositories --repository-names "$PROJECT_NAME-$ENVIRONMENT-backend" --region $AWS_REGION &> /dev/null; then
        log_info "Creating backend ECR repository..."
        aws ecr create-repository \
            --repository-name "$PROJECT_NAME-$ENVIRONMENT-backend" \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true
    fi
    
    # Frontend repository
    if ! aws ecr describe-repositories --repository-names "$PROJECT_NAME-$ENVIRONMENT-frontend" --region $AWS_REGION &> /dev/null; then
        log_info "Creating frontend ECR repository..."
        aws ecr create-repository \
            --repository-name "$PROJECT_NAME-$ENVIRONMENT-frontend" \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true
    fi
    
    log_success "ECR repositories ready!"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Backend image
    log_info "Building backend image..."
    docker build --platform linux/amd64 --no-cache -f python-backend/Dockerfile.prod -t $PROJECT_NAME-backend ./python-backend
    docker tag $PROJECT_NAME-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-backend:latest
    
    log_info "Pushing backend image..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-backend:latest
    
    # Frontend image
    log_info "Building frontend image..."
    docker build --platform linux/amd64 --no-cache -f client/Dockerfile.prod -t $PROJECT_NAME-frontend ./client
    docker tag $PROJECT_NAME-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-frontend:latest
    
    log_info "Pushing frontend image..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-frontend:latest
    
    log_success "Docker images built and pushed successfully!"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd infrastructure
    
    # Initialize Terraform
    terraform init
    
    # Create terraform.tfvars file
    cat > terraform.tfvars << EOF
aws_region = "$AWS_REGION"
project_name = "$PROJECT_NAME"
environment = "$ENVIRONMENT"
backend_image_uri = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-backend:latest"
frontend_image_uri = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$ENVIRONMENT-frontend:latest"
jwt_secret_key = "$JWT_SECRET_KEY"
google_maps_api_key = "$GOOGLE_MAPS_API_KEY"
EOF
    
    # Plan deployment
    terraform plan -var-file="terraform.tfvars" -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    cd ..
    
    log_success "Infrastructure deployed successfully!"
}

# Update ECS services
update_services() {
    log_info "Updating ECS services..."
    
    # Force new deployment for backend service
    aws ecs update-service \
        --cluster $PROJECT_NAME-$ENVIRONMENT-cluster \
        --service $PROJECT_NAME-$ENVIRONMENT-backend-service \
        --force-new-deployment \
        --region $AWS_REGION > /dev/null
    
    # Force new deployment for frontend service
    aws ecs update-service \
        --cluster $PROJECT_NAME-$ENVIRONMENT-cluster \
        --service $PROJECT_NAME-$ENVIRONMENT-frontend-service \
        --force-new-deployment \
        --region $AWS_REGION > /dev/null
    
    log_success "ECS services updated successfully!"
}

# Wait for services to be stable
wait_for_services() {
    log_info "Waiting for services to stabilize (this may take a few minutes)..."
    
    # Wait for backend service
    log_info "Waiting for backend service..."
    aws ecs wait services-stable \
        --cluster $PROJECT_NAME-$ENVIRONMENT-cluster \
        --services $PROJECT_NAME-$ENVIRONMENT-backend-service \
        --region $AWS_REGION
    
    # Wait for frontend service
    log_info "Waiting for frontend service..."
    aws ecs wait services-stable \
        --cluster $PROJECT_NAME-$ENVIRONMENT-cluster \
        --services $PROJECT_NAME-$ENVIRONMENT-frontend-service \
        --region $AWS_REGION
    
    log_success "Services are stable!"
}

# Get application URL
get_application_url() {
    log_info "Getting application URL..."
    
    cd infrastructure
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
    APPLICATION_URL=$(terraform output -raw application_url 2>/dev/null || echo "http://$ALB_DNS_NAME")
    cd ..
    
    log_success "🎉 Application deployed successfully!"
    log_success "🌐 Application URL: $APPLICATION_URL"
    log_info "📊 Load Balancer DNS: $ALB_DNS_NAME"
    log_info ""
    log_info "📋 Next steps:"
    log_info "  1. Wait 2-3 minutes for services to fully start"
    log_info "  2. Visit the URL above to access your app"
    log_info "  3. Check logs if needed: ./deploy.sh logs"
}

# Show logs
show_logs() {
    log_info "Recent application logs:"
    echo ""
    log_info "Backend logs:"
    aws logs tail /ecs/$PROJECT_NAME-$ENVIRONMENT-backend --since 10m --region $AWS_REGION || true
    echo ""
    log_info "Frontend logs:"
    aws logs tail /ecs/$PROJECT_NAME-$ENVIRONMENT-frontend --since 10m --region $AWS_REGION || true
}

# Show status
show_status() {
    log_info "Deployment status:"
    
    # ECS Services
    aws ecs describe-services \
        --cluster $PROJECT_NAME-$ENVIRONMENT-cluster \
        --services $PROJECT_NAME-$ENVIRONMENT-backend-service $PROJECT_NAME-$ENVIRONMENT-frontend-service \
        --region $AWS_REGION \
        --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' \
        --output table
    
    # Get URL
    cd infrastructure
    APPLICATION_URL=$(terraform output -raw application_url 2>/dev/null || echo "Not available")
    cd ..
    
    echo ""
    log_info "Application URL: $APPLICATION_URL"
}

# Main deployment function
main() {
    log_info "🚀 Starting Travel Diary App deployment..."
    log_info "📍 Region: $AWS_REGION"
    log_info "📦 Project: $PROJECT_NAME"
    log_info "🏷️  Environment: $ENVIRONMENT"
    log_info "🔑 AWS Account: $AWS_ACCOUNT_ID"
    echo ""
    
    check_prerequisites
    create_ecr_repositories
    build_and_push_images
    deploy_infrastructure
    update_services
    wait_for_services
    get_application_url
    
    log_success "🎉 Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        create_ecr_repositories
        build_and_push_images
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "update")
        check_prerequisites
        create_ecr_repositories
        build_and_push_images
        update_services
        wait_for_services
        get_application_url
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "destroy")
        log_warning "⚠️  Destroying infrastructure..."
        read -p "Are you sure you want to destroy all resources? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd infrastructure
            terraform destroy -auto-approve
            cd ..
            log_success "Infrastructure destroyed!"
        else
            log_info "Destruction cancelled."
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|build|infrastructure|update|status|logs|destroy}"
        echo ""
        echo "Commands:"
        echo "  deploy        - Full deployment (default)"
        echo "  build         - Build and push Docker images only"
        echo "  infrastructure - Deploy infrastructure only"
        echo "  update        - Update services with new images"
        echo "  status        - Show deployment status"
        echo "  logs          - Show recent application logs"
        echo "  destroy       - Destroy all infrastructure"
        echo ""
        echo "Environment variables:"
        echo "  AWS_REGION           - AWS region (default: us-east-1)"
        echo "  PROJECT_NAME         - Project name (default: travel-diary)"
        echo "  ENVIRONMENT          - Environment (default: prod)"
        echo "  JWT_SECRET_KEY       - JWT secret key (required)"
        echo "  GOOGLE_MAPS_API_KEY  - Google Maps API key (optional)"
        exit 1
        ;;
esac
