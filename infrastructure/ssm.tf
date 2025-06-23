# SSM Parameters for sensitive data

# JWT Secret Key
resource "aws_ssm_parameter" "jwt_secret" {
  count = var.jwt_secret_key != "" ? 1 : 0

  name  = "/${local.name_prefix}/jwt-secret-key"
  type  = "SecureString"
  value = var.jwt_secret_key
}

# Google Maps API Key
resource "aws_ssm_parameter" "google_maps_api_key" {
  count = var.google_maps_api_key != "" ? 1 : 0

  name  = "/${local.name_prefix}/google-maps-api-key"
  type  = "SecureString"
  value = var.google_maps_api_key
}

# IAM policy for ECS tasks to access SSM parameters
resource "aws_iam_role_policy" "ecs_task_ssm_policy" {
  name = "${local.name_prefix}-ecs-task-ssm-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = concat(
          var.jwt_secret_key != "" ? [aws_ssm_parameter.jwt_secret[0].arn] : [],
          var.google_maps_api_key != "" ? [aws_ssm_parameter.google_maps_api_key[0].arn] : []
        )
      }
    ]
  })
}
