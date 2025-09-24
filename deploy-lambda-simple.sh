#!/bin/bash

# Simple Lambda deployment script
cd python-backend
zip -r lambda-deployment.zip working_complete_handler.py
aws lambda update-function-code --function-name travel-diary-prod-backend --zip-file fileb://lambda-deployment.zip --region ap-northeast-1
rm lambda-deployment.zip
