# GitHub Integration Variables (Optional)

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "travel-diary-app"
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
  default     = ""
}

# Lambda function with GitHub integration
resource "aws_lambda_function" "backend_with_github" {
  count = var.github_owner != "" ? 1 : 0
  
  filename         = "${path.module}/backend.zip"
  function_name    = "${local.name_prefix}-backend-github"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "app.lambda_handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 512

  environment {
    variables = {
      DATABASE_TYPE       = "dynamodb"
      AWS_REGION         = var.aws_region
      USERS_TABLE        = aws_dynamodb_table.users.name
      TRIPS_TABLE        = aws_dynamodb_table.trips.name
      SESSIONS_TABLE     = aws_dynamodb_table.sessions.name
      ENVIRONMENT        = var.environment
      DEBUG             = "false"
      SECRET_KEY        = var.jwt_secret_key
      GOOGLE_MAPS_API_KEY = var.google_maps_api_key
      GITHUB_REPO       = "${var.github_owner}/${var.github_repo}"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-lambda-github"
    GitHubRepo = "${var.github_owner}/${var.github_repo}"
  })

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
