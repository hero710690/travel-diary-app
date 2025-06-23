# DynamoDB Tables - Only create if they don't already exist

# Users Table - conditional creation
resource "aws_dynamodb_table" "users" {
  count = can(data.aws_dynamodb_table.existing_users.name) ? 0 : 1
  
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
}

# Trips Table - conditional creation
resource "aws_dynamodb_table" "trips" {
  count = can(data.aws_dynamodb_table.existing_trips.name) ? 0 : 1
  
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
}

# Sessions Table - conditional creation
resource "aws_dynamodb_table" "sessions" {
  count = can(data.aws_dynamodb_table.existing_sessions.name) ? 0 : 1
  
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
}
