# 🌍 Travel Diary App

A full-stack serverless travel diary application built with React, FastAPI, and AWS Lambda.

## 🏗️ Architecture

- **Frontend**: React.js hosted on S3 + CloudFront
- **Backend**: FastAPI on AWS Lambda + API Gateway
- **Database**: DynamoDB
- **CI/CD**: GitHub Actions
- **Infrastructure**: Terraform

## 🚀 Features

- ✅ User authentication (JWT)
- ✅ Trip planning and management
- ✅ Itinerary creation
- ✅ Wishlist management
- ✅ Responsive design
- ✅ Serverless architecture
- ✅ Automatic deployments

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

### Automatic Deployment (GitHub Actions)
1. Push to `main` branch
2. GitHub Actions automatically deploys to AWS
3. Access your app at the CloudFront URL

### Manual Deployment
```bash
# Deploy infrastructure and application
./deploy-lambda.sh deploy

# Or deploy components separately
./deploy-lambda.sh infrastructure
./deploy-lambda.sh update-lambda
./deploy-lambda.sh update-frontend
```

## 🔧 Configuration

### GitHub Secrets Required
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET_KEY`
- `GOOGLE_MAPS_API_KEY` (optional)

### Environment Variables
- `AWS_REGION`: AWS deployment region
- `PROJECT_NAME`: Project identifier
- `ENVIRONMENT`: Deployment environment (prod/dev)

## 📊 Cost Optimization

This serverless architecture provides significant cost savings:
- **Lambda**: Pay per request (~$0.20/1M requests)
- **DynamoDB**: Pay per request
- **S3 + CloudFront**: ~$0.50/month for static hosting
- **API Gateway**: Pay per API call

**Estimated monthly cost**: $5-15 for typical usage vs $95+ for traditional servers.

## 🏗️ Infrastructure

The application uses these AWS services:
- **AWS Lambda**: Serverless compute
- **API Gateway**: REST API management
- **DynamoDB**: NoSQL database
- **S3**: Static file hosting
- **CloudFront**: Global CDN
- **IAM**: Access management

## 🔒 Security

- JWT-based authentication
- HTTPS everywhere (CloudFront)
- IAM least-privilege policies
- Secrets managed via GitHub/AWS
- CORS properly configured

## 📱 API Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/trips` - List user trips
- `POST /api/v1/trips` - Create new trip
- `PUT /api/v1/trips/{id}` - Update trip
- `DELETE /api/v1/trips/{id}` - Delete trip

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
2. Review the deployment logs
3. Check AWS CloudWatch logs
4. Contact the maintainers

---

Built with ❤️ using serverless technologies
