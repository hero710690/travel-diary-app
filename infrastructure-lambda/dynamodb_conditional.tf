# Check if DynamoDB tables already exist
data "aws_dynamodb_table" "existing_users" {
  name = "${local.name_prefix}-users-serverless"
  
  # This will fail silently if table doesn't exist
  lifecycle {
    postcondition {
      condition     = self.name != null
      error_message = "Users table does not exist"
    }
  }
}

data "aws_dynamodb_table" "existing_trips" {
  name = "${local.name_prefix}-trips-serverless"
  
  lifecycle {
    postcondition {
      condition     = self.name != null
      error_message = "Trips table does not exist"
    }
  }
}

data "aws_dynamodb_table" "existing_sessions" {
  name = "${local.name_prefix}-sessions-serverless"
  
  lifecycle {
    postcondition {
      condition     = self.name != null
      error_message = "Sessions table does not exist"
    }
  }
}

# Local values to determine which tables to use
locals {
  # Try to use existing tables, fall back to new ones if they don't exist
  users_table_name    = try(data.aws_dynamodb_table.existing_users.name, aws_dynamodb_table.users[0].name)
  trips_table_name    = try(data.aws_dynamodb_table.existing_trips.name, aws_dynamodb_table.trips[0].name)
  sessions_table_name = try(data.aws_dynamodb_table.existing_sessions.name, aws_dynamodb_table.sessions[0].name)
  
  users_table_arn     = try(data.aws_dynamodb_table.existing_users.arn, aws_dynamodb_table.users[0].arn)
  trips_table_arn     = try(data.aws_dynamodb_table.existing_trips.arn, aws_dynamodb_table.trips[0].arn)
  sessions_table_arn  = try(data.aws_dynamodb_table.existing_sessions.arn, aws_dynamodb_table.sessions[0].arn)
}
