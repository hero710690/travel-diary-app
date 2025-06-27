#!/bin/bash

# 🌍 Wanderlust Travel Diary - Deployment Verification Script
set -e

# Configuration
AWS_REGION=${AWS_REGION:-ap-northeast-1}
S3_BUCKET="travel-diary-prod-frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Travel emojis
COMPASS="🧭"
PLANE="✈️"
GLOBE="🌍"
CHECK="✅"
CROSS="❌"

echo -e "${PURPLE}${GLOBE} Verifying your travel-themed deployment...${NC}"
echo ""

# Check S3 bucket
echo -e "${BLUE}${COMPASS} Checking S3 bucket...${NC}"
if aws s3 ls "s3://$S3_BUCKET" --region $AWS_REGION &> /dev/null; then
    echo -e "${GREEN}${CHECK} S3 bucket exists and is accessible${NC}"
    
    # Check for key files
    if aws s3 ls "s3://$S3_BUCKET/index.html" --region $AWS_REGION &> /dev/null; then
        echo -e "${GREEN}${CHECK} index.html found${NC}"
    else
        echo -e "${RED}${CROSS} index.html not found${NC}"
    fi
    
    if aws s3 ls "s3://$S3_BUCKET/static/" --region $AWS_REGION &> /dev/null; then
        echo -e "${GREEN}${CHECK} Static assets found${NC}"
    else
        echo -e "${YELLOW}⚠️  Static assets not found${NC}"
    fi
else
    echo -e "${RED}${CROSS} S3 bucket not accessible${NC}"
fi

echo ""

# Check CloudFront distribution
echo -e "${BLUE}${PLANE} Checking CloudFront distribution...${NC}"
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '$S3_BUCKET')].Id" \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${GREEN}${CHECK} CloudFront distribution found: $CLOUDFRONT_DISTRIBUTION_ID${NC}"
    
    CLOUDFRONT_URL=$(aws cloudfront get-distribution \
        --id $CLOUDFRONT_DISTRIBUTION_ID \
        --query 'Distribution.DomainName' \
        --output text \
        --region $AWS_REGION)
    
    echo -e "${GREEN}${CHECK} CloudFront URL: https://$CLOUDFRONT_URL${NC}"
else
    echo -e "${YELLOW}⚠️  CloudFront distribution not found${NC}"
fi

echo ""

# Get URLs
S3_WEBSITE_URL="http://$S3_BUCKET.s3-website-$AWS_REGION.amazonaws.com"

echo -e "${PURPLE}${GLOBE} Your Travel Diary URLs:${NC}"
echo -e "${BLUE}📍 S3 Website: ${NC}$S3_WEBSITE_URL"
if [ -n "$CLOUDFRONT_URL" ]; then
    echo -e "${BLUE}🌐 CloudFront: ${NC}https://$CLOUDFRONT_URL ${GREEN}(Recommended)${NC}"
fi

echo ""
echo -e "${GREEN}${PLANE} Verification complete! Ready for your travel adventures!${NC}"
