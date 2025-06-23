# Create a dummy zip file if backend.zip doesn't exist
resource "null_resource" "lambda_package" {
  provisioner "local-exec" {
    command = <<-EOT
      if [ ! -f "${path.module}/backend.zip" ]; then
        echo "Creating dummy Lambda package..."
        echo 'def handler(event, context): return {"statusCode": 200, "body": "Hello"}' > /tmp/lambda_dummy.py
        cd /tmp && zip ${path.module}/backend.zip lambda_dummy.py
        rm lambda_dummy.py
      fi
    EOT
  }

  triggers = {
    always_run = timestamp()
  }
}

# Lambda Function for Backend API
resource "aws_lambda_function" "backend" {
  filename         = "${path.module}/backend.zip"
  function_name    = "${local.name_prefix}-backend-v2"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "app.lambda_handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 512

  environment {
    variables = {
      DATABASE_TYPE    = "dynamodb"
      USERS_TABLE     = aws_dynamodb_table.users.name
      TRIPS_TABLE     = aws_dynamodb_table.trips.name
      SESSIONS_TABLE  = aws_dynamodb_table.sessions.name
      ENVIRONMENT     = var.environment
      DEBUG          = "false"
      SECRET_KEY     = var.jwt_secret_key
      GOOGLE_MAPS_API_KEY = var.google_maps_api_key
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda_logs,
    null_resource.lambda_package
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-lambda"
  })

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.name_prefix}-lambda-execution-role-v2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB permissions for Lambda
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "${local.name_prefix}-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.trips.arn,
          aws_dynamodb_table.sessions.arn,
          "${aws_dynamodb_table.users.arn}/index/*",
          "${aws_dynamodb_table.trips.arn}/index/*",
          "${aws_dynamodb_table.sessions.arn}/index/*"
        ]
      }
    ]
  })
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.name_prefix}-backend-v2"
  retention_in_days = 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-logs-v2"
  })
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
