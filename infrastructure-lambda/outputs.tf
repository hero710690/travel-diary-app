output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_bucket_domain" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.backend.function_name
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "dynamodb_users_table_name" {
  description = "Name of the DynamoDB users table"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_trips_table_name" {
  description = "Name of the DynamoDB trips table"
  value       = aws_dynamodb_table.trips.name
}

output "dynamodb_sessions_table_name" {
  description = "Name of the DynamoDB sessions table"
  value       = aws_dynamodb_table.sessions.name
}

output "application_url" {
  description = "URL to access the application"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

# Cost comparison info
output "architecture_info" {
  description = "Architecture information"
  value = {
    frontend = "CloudFront + S3 Static Hosting"
    backend  = "API Gateway + Lambda"
    database = "DynamoDB"
    benefits = [
      "Pay only for actual requests",
      "No idle server costs", 
      "Auto-scaling from 0 to thousands",
      "Reduced operational overhead"
    ]
  }
}
