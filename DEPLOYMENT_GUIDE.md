# 🚀 Travel Diary App - AWS Deployment Guide

## 📋 **Overview**

This guide will help you deploy the Travel Diary app to AWS using:
- **ECS Fargate** for containerized services
- **DynamoDB** for the database
- **Application Load Balancer** for routing
- **ECR** for container registry
- **Terraform** for infrastructure as code

## 🏗️ **Architecture**

```
Internet → ALB → ECS Services → DynamoDB
                ├── Frontend (React/Nginx)
                └── Backend (FastAPI)
```

## 📋 **Prerequisites**

### Required Tools
- [AWS CLI](https://aws.amazon.com/cli/) v2.x
- [Docker](https://www.docker.com/) 20.x+
- [Terraform](https://www.terraform.io/) 1.0+
- [Node.js](https://nodejs.org/) 18.x+ (for local development)
- [Python](https://www.python.org/) 3.11+ (for local development)

### AWS Account Setup
1. **AWS Account** with appropriate permissions
2. **AWS CLI configured** with credentials
3. **IAM permissions** for:
   - ECS (Fargate)
   - ECR
   - DynamoDB
   - Application Load Balancer
   - VPC management
   - IAM role management
   - SSM Parameter Store

## 🔧 **Configuration**

### 1. Environment Variables
Set the following environment variables or update them in the deployment script:

```bash
export AWS_REGION=us-east-1
export PROJECT_NAME=travel-diary
export ENVIRONMENT=prod
```

### 2. Secrets Configuration
You'll need to provide these secrets during deployment:

```bash
# JWT Secret Key (generate a strong random key)
export JWT_SECRET_KEY="your-super-secret-jwt-key-change-this"

# Google Maps API Key (optional)
export GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### 3. Domain Configuration (Optional)
If you have a custom domain:

```bash
export DOMAIN_NAME="your-domain.com"
export CERTIFICATE_ARN="arn:aws:acm:region:account:certificate/cert-id"
```

## 🚀 **Deployment Steps**

### Option 1: One-Command Deployment

```bash
# Full deployment
./deploy.sh deploy
```

### Option 2: Step-by-Step Deployment

```bash
# 1. Build and push Docker images
./deploy.sh build

# 2. Deploy infrastructure
./deploy.sh infrastructure

# 3. Update services (if needed)
./deploy.sh update
```

## 📊 **What Gets Deployed**

### Infrastructure Components

#### **Networking**
- VPC with public and private subnets
- Internet Gateway and NAT Gateways
- Security Groups for ALB and ECS

#### **Container Registry**
- ECR repositories for frontend and backend images
- Lifecycle policies for image cleanup

#### **Database**
- DynamoDB tables:
  - `travel-diary-prod-users`
  - `travel-diary-prod-trips`
  - `travel-diary-prod-sessions`

#### **Compute**
- ECS Fargate cluster
- Backend service (2 tasks, auto-scaling 2-10)
- Frontend service (2 tasks, auto-scaling 2-10)

#### **Load Balancing**
- Application Load Balancer
- Target groups for frontend and backend
- Routing rules:
  - `/api/*` → Backend service
  - `/*` → Frontend service

#### **Security**
- IAM roles for ECS tasks
- SSM Parameter Store for secrets
- Security groups with least privilege

### Application Configuration

#### **Backend (FastAPI)**
- **Database**: DynamoDB (replaces MongoDB)
- **Authentication**: JWT tokens
- **API Documentation**: Available at `/docs`
- **Health Check**: Available at `/health`

#### **Frontend (React)**
- **Build**: Production optimized build
- **Server**: Nginx with compression and caching
- **Routing**: Client-side routing support

## 🔍 **Verification**

### 1. Check Deployment Status

```bash
# Check ECS services
aws ecs describe-services \
  --cluster travel-diary-prod-cluster \
  --services travel-diary-prod-backend-service travel-diary-prod-frontend-service

# Check ALB health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names travel-diary-prod-backend-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

### 2. Test Application

```bash
# Get application URL
cd infrastructure
terraform output application_url
```

Visit the URL and verify:
- ✅ Frontend loads correctly
- ✅ User registration works
- ✅ Login functionality works
- ✅ Trip creation works
- ✅ API endpoints respond correctly

### 3. Check Logs

```bash
# Backend logs
aws logs tail /ecs/travel-diary-prod-backend --follow

# Frontend logs
aws logs tail /ecs/travel-diary-prod-frontend --follow
```

## 🔄 **Updates and Maintenance**

### Updating the Application

```bash
# Build new images and update services
./deploy.sh update
```

### Scaling Services

```bash
# Scale backend service
aws ecs update-service \
  --cluster travel-diary-prod-cluster \
  --service travel-diary-prod-backend-service \
  --desired-count 4

# Auto-scaling is configured for CPU/Memory thresholds
```

### Database Migration

The app automatically handles the migration from MongoDB to DynamoDB:
- New deployments use DynamoDB by default
- Data structure is preserved
- No manual migration needed for new deployments

## 💰 **Cost Estimation**

### Monthly AWS Costs (approximate)

| Service | Usage | Cost |
|---------|-------|------|
| ECS Fargate | 4 tasks (0.25 vCPU, 0.5GB each) | ~$25 |
| DynamoDB | Pay-per-request, light usage | ~$5 |
| ALB | 1 load balancer | ~$18 |
| NAT Gateway | 2 gateways | ~$45 |
| ECR | Image storage | ~$2 |
| **Total** | | **~$95/month** |

*Costs may vary based on actual usage and AWS region*

## 🛡️ **Security Features**

### Infrastructure Security
- ✅ Private subnets for ECS tasks
- ✅ Security groups with minimal access
- ✅ IAM roles with least privilege
- ✅ Secrets stored in SSM Parameter Store
- ✅ HTTPS support (with certificate)

### Application Security
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (NoSQL)

## 🔧 **Troubleshooting**

### Common Issues

#### **ECS Tasks Not Starting**
```bash
# Check task definition
aws ecs describe-task-definition --task-definition travel-diary-prod-backend

# Check service events
aws ecs describe-services \
  --cluster travel-diary-prod-cluster \
  --services travel-diary-prod-backend-service
```

#### **ALB Health Check Failures**
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

# Check security group rules
aws ec2 describe-security-groups \
  --group-ids <security-group-id>
```

#### **DynamoDB Access Issues**
```bash
# Check IAM role permissions
aws iam get-role-policy \
  --role-name travel-diary-prod-ecs-task-role \
  --policy-name travel-diary-prod-ecs-task-dynamodb-policy
```

### Logs and Monitoring

```bash
# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/ecs/travel-diary"

# Monitor ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=travel-diary-prod-backend-service \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

## 🗑️ **Cleanup**

To destroy all resources:

```bash
./deploy.sh destroy
```

**⚠️ Warning**: This will delete all data and resources. Make sure to backup any important data first.

## 📞 **Support**

### Useful Commands

```bash
# Check deployment status
./deploy.sh status

# View application logs
./deploy.sh logs

# Connect to running container (for debugging)
aws ecs execute-command \
  --cluster travel-diary-prod-cluster \
  --task <task-arn> \
  --container backend \
  --interactive \
  --command "/bin/bash"
```

### AWS Resources Created

- **VPC**: `travel-diary-prod-vpc`
- **ECS Cluster**: `travel-diary-prod-cluster`
- **DynamoDB Tables**: `travel-diary-prod-*`
- **ECR Repositories**: `travel-diary-prod-backend`, `travel-diary-prod-frontend`
- **Load Balancer**: `travel-diary-prod-alb`

---

## 🎉 **Congratulations!**

Your Travel Diary app is now running on AWS with:
- ✅ Scalable container infrastructure
- ✅ Managed database (DynamoDB)
- ✅ Load balancing and auto-scaling
- ✅ Production-ready security
- ✅ Infrastructure as code

The app is ready for production use! 🚀
