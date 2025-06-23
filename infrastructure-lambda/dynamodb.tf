# DynamoDB Tables - Use fixed names (not random)

# Users Table
resource "aws_dynamodb_table" "users" {
  name           = "${local.name_prefix}-users-serverless"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-users-table-serverless"
  })

  lifecycle {
    # Prevent destruction of table with data
    prevent_destroy = false  # Set to true in production
  }
}

# Trips Table
resource "aws_dynamodb_table" "trips" {
  name           = "${local.name_prefix}-trips-serverless"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "user-trips-index"
    hash_key        = "user_id"
    range_key       = "status"
    projection_type = "ALL"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-trips-table-serverless"
  })

  lifecycle {
    # Prevent destruction of table with data
    prevent_destroy = false  # Set to true in production
  }
}

# Sessions Table
resource "aws_dynamodb_table" "sessions" {
  name           = "${local.name_prefix}-sessions-serverless"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-sessions-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-sessions-table-serverless"
  })

  lifecycle {
    # Prevent destruction of table with data
    prevent_destroy = false  # Set to true in production
  }
}
