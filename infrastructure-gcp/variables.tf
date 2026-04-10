variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "jean-project-492204"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "travel-diary"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "jwt_secret_key" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API key"
  type        = string
  sensitive   = true
  default     = ""
}
