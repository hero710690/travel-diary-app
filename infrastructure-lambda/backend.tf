# Terraform Backend Configuration
terraform {
  # For GitHub Actions, we'll use local backend
  # In production, consider using S3 backend for state management
  
  # Uncomment below for S3 backend (recommended for production)
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "travel-diary/terraform.tfstate"
  #   region = "ap-northeast-1"
  # }
}
