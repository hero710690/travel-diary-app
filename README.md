# 🌍 Travel Diary App

A full-stack serverless travel diary application built with React, FastAPI, and AWS Lambda.

## 🏗️ Architecture

- **Frontend**: React.js hosted on S3 + CloudFront
- **Backend**: FastAPI on AWS Lambda + API Gateway
- **Database**: DynamoDB
- **CI/CD**: GitHub Actions (Hybrid Deployment)
- **Infrastructure**: Manual + Terraform

## 🚀 Features

- ✅ User authentication (JWT)
- ✅ Trip planning and management
- ✅ Itinerary creation
- ✅ Wishlist management
- ✅ Responsive design
- ✅ Serverless architecture
- ✅ Hybrid deployment strategy

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- AWS CLI configured
- Docker (for Lambda builds)

### Setup
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/travel-diary-app.git
cd travel-diary-app

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../python-backend
pip install -r requirements-lambda.txt

# Set environment variables
export JWT_SECRET_KEY="your-jwt-secret"
export AWS_REGION="ap-northeast-1"
```

### Run Locally
```bash
# Start frontend
cd client
npm start

# Start backend (in another terminal)
cd python-backend
uvicorn app.main:app --reload
```

## 🚀 Deployment

### Hybrid Deployment Strategy

This project uses a **hybrid deployment approach** for production-grade control:

- **Manual Infrastructure**: Persistent components (DynamoDB, CloudFront, S3)
- **Automated Application**: Code updates (Lambda function, frontend builds)

### Step 1: Deploy Manual Infrastructure (One-time)

Deploy the persistent infrastructure components manually:

```bash
# Deploy DynamoDB tables, S3 bucket, and CloudFront distribution
./deploy-manual-infrastructure.sh
```

This creates:
- ✅ **DynamoDB Tables**: travel-diary-prod-*-serverless
- ✅ **S3 Bucket**: travel-diary-prod-frontend
- ✅ **CloudFront Distribution**: Global CDN

### Step 2: Deploy Lambda Function

Choose one of the following options:

#### Option A: Automatic Lambda Creation (Recommended)
The GitHub Actions workflow will automatically create the Lambda function if it doesn't exist:

```bash
# Just push your code - Lambda function will be created automatically
git push origin main
```

#### Option B: Manual Lambda Creation
Create the Lambda function manually before pushing code:

```bash
# Create Lambda function and IAM role manually
./create-lambda-function.sh

# Then push your code for deployment
git push origin main
```

### Step 3: Configure GitHub Secrets

Add these secrets in your GitHub repository settings:

- `AWS_ACCESS_KEY_ID`: Your AWS Access Key
- `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Key
- `JWT_SECRET_KEY`: JWT secret for authentication
- `GOOGLE_MAPS_API_KEY`: Google Maps API key (optional)

### Step 4: Automated Deployments

After the initial setup, every push to `main` automatically:

- ✅ **Updates Lambda function** with latest backend code
- ✅ **Builds and deploys frontend** to S3
- ✅ **Invalidates CloudFront cache** for fresh content
- ✅ **Completes in 2-3 minutes** (vs 20+ minutes for full infrastructure)

## 🔧 Configuration

### Manual Infrastructure Names
The deployment scripts use these fixed names:
- **S3 Bucket**: `travel-diary-prod-frontend`
- **CloudFront Comment**: `Travel Diary App CDN - prod`
- **DynamoDB Tables**: `travel-diary-prod-*-serverless`
- **Lambda Function**: `travel-diary-prod-backend`

### Environment Variables
- `AWS_REGION`: AWS deployment region (ap-northeast-1)
- `PROJECT_NAME`: Project identifier (travel-diary)
- `ENVIRONMENT`: Deployment environment (prod)

## 📊 Cost Optimization

This hybrid serverless architecture provides significant cost savings:

### Infrastructure Costs
- **DynamoDB**: Pay per request (~$1.25/million reads)
- **Lambda**: Pay per request (~$0.20/million requests)
- **S3 + CloudFront**: ~$0.50/month for static hosting
- **API Gateway**: Pay per API call (~$3.50/million calls)

### Deployment Benefits
- **Manual Infrastructure**: Created once, no recreation costs
- **Fast App Deployments**: 2-3 minutes vs 20+ minutes
- **No Idle Costs**: Pay only for actual usage
- **Estimated monthly cost**: $5-15 for typical usage vs $95+ for traditional servers

## 🏗️ Infrastructure Components

### Manual Components (Persistent)
- **DynamoDB**: NoSQL database tables
- **S3**: Static file hosting bucket
- **CloudFront**: Global CDN distribution

### Automated Components (Updated per push)
- **Lambda**: Serverless compute function
- **API Gateway**: REST API management
- **Frontend Build**: React production bundle

## 🔒 Security

- JWT-based authentication
- HTTPS everywhere (CloudFront)
- IAM least-privilege policies
- Secrets managed via GitHub/AWS
- CORS properly configured
- Manual infrastructure oversight

## 📱 API Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/trips` - List user trips
- `POST /api/v1/trips` - Create new trip
- `PUT /api/v1/trips/{id}` - Update trip
- `DELETE /api/v1/trips/{id}` - Delete trip

## 🔄 Deployment Workflows

### Manual Infrastructure Script
```bash
./deploy-manual-infrastructure.sh
```
- Creates DynamoDB tables
- Sets up S3 bucket with website hosting
- Configures CloudFront distribution
- One-time setup (~20 minutes)

### Lambda Creation Script (Option B)
```bash
./create-lambda-function.sh
```
- Creates IAM role with proper permissions
- Creates Lambda function with dummy code
- Sets up environment variables
- Ready for GitHub Actions updates

### GitHub Actions Workflow
Automatically triggered on push to `main`:
- Runs tests (Python + React)
- Builds Lambda deployment package
- Creates/updates Lambda function
- Builds and deploys React frontend
- Invalidates CloudFront cache
- Completes in 2-3 minutes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the GitHub Issues
2. Review the deployment logs in GitHub Actions
3. Check AWS CloudWatch logs for Lambda function
4. Verify manual infrastructure is properly deployed

## 🎯 Quick Start Checklist

- [ ] Clone repository
- [ ] Configure AWS CLI
- [ ] Run `./deploy-manual-infrastructure.sh`
- [ ] Configure GitHub Secrets
- [ ] Choose Lambda deployment option (A or B)
- [ ] Push code to trigger automated deployment
- [ ] Access your app via CloudFront URL

---

Built with ❤️ using hybrid serverless deployment strategy for production-grade reliability and fast development cycles.
