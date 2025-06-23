# Data sources to reference existing DynamoDB tables

data "aws_dynamodb_table" "users" {
  name = "travel-diary-prod-users"
}

data "aws_dynamodb_table" "trips" {
  name = "travel-diary-prod-trips"
}

data "aws_dynamodb_table" "sessions" {
  name = "travel-diary-prod-sessions"
}
