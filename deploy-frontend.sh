#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="travel-diary-prod-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E1JD48IT5LNOGJ"
REGION="ap-northeast-1"

echo -e "${YELLOW}=== Travel Diary Frontend Deployment ===${NC}"
echo -e "${YELLOW}S3 Bucket:${NC} $S3_BUCKET"
echo -e "${YELLOW}CloudFront Distribution:${NC} $CLOUDFRONT_DISTRIBUTION_ID"
echo -e "${YELLOW}Region:${NC} $REGION"
echo ""

# Step 1: Build React application
echo -e "${YELLOW}Step 1: Building React application...${NC}"
cd client
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Aborting deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Step 2: Deploy to S3
echo -e "${YELLOW}Step 2: Deploying to S3...${NC}"
aws s3 sync build/ s3://$S3_BUCKET --region $REGION --delete

# Check if S3 sync was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}S3 deployment failed! Please check your AWS credentials and permissions.${NC}"
    exit 1
fi

echo -e "${GREEN}S3 deployment successful!${NC}"
echo ""

# Step 3: Invalidate CloudFront cache
echo -e "${YELLOW}Step 3: Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

# Check if invalidation was created successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}CloudFront invalidation failed! Please check your AWS credentials and permissions.${NC}"
    exit 1
fi

echo -e "${GREEN}CloudFront invalidation created successfully!${NC}"
echo -e "${YELLOW}Invalidation ID:${NC} $INVALIDATION_ID"
echo ""

# Step 4: Check invalidation status
echo -e "${YELLOW}Step 4: Checking invalidation status...${NC}"
echo -e "${YELLOW}Invalidation is in progress. This may take a few minutes to complete.${NC}"
echo -e "${YELLOW}You can check the status with:${NC}"
echo "aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID"
echo ""

# Get current date and time for deployment record
DEPLOY_DATE=$(date "+%Y-%m-%d %H:%M:%S")
DEPLOY_VERSION=$(grep -o '"version": "[^"]*"' client/package.json | cut -d'"' -f4)

echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo -e "${YELLOW}Date:${NC} $DEPLOY_DATE"
echo -e "${YELLOW}Version:${NC} $DEPLOY_VERSION"
echo -e "${YELLOW}Frontend URL:${NC} https://d16hcqzmptnoh8.cloudfront.net"
echo -e "${GREEN}Deployment completed successfully!${NC}"

# Return to the root directory
cd ..

# Optional: Update README with deployment info
echo -e "${YELLOW}Would you like to update the README.md with this deployment information? (y/n)${NC}"
read -r update_readme

if [[ $update_readme == "y" || $update_readme == "Y" ]]; then
    # Get the bundle size
    BUNDLE_SIZE=$(find client/build/static/js -name "main.*.js" -exec du -h {} \; | cut -f1)
    BUNDLE_NAME=$(find client/build/static/js -name "main.*.js" | xargs basename)
    
    # Update README.md
    sed -i.bak "s/### \*\*Latest Deployment\*\* ✅ \*\*.*\*\*/### **Latest Deployment** ✅ **$(date +%Y-%m-%d)**/g" README.md
    sed -i.bak "s/- \*\*Version\*\*: .*/- **Version**: Bus Transportation v1.6/g" README.md
    sed -i.bak "s/- \*\*Frontend Bundle\*\*: .*/- **Frontend Bundle**: $BUNDLE_NAME ($BUNDLE_SIZE gzipped)/g" README.md
    sed -i.bak "s/- \*\*CloudFront\*\*: .*/- **CloudFront**: Cache invalidation $INVALIDATION_ID/g" README.md
    
    # Remove backup file
    rm README.md.bak
    
    echo -e "${GREEN}README.md updated with deployment information!${NC}"
fi

echo -e "${GREEN}Thank you for using the Travel Diary deployment script!${NC}"