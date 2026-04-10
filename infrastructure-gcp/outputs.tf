output "cloud_run_url" {
  description = "URL of the Cloud Run backend service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "cloud_run_api_url" {
  description = "API base URL"
  value       = "${google_cloud_run_v2_service.backend.uri}/api/v1"
}

output "frontend_url" {
  description = "Firebase Hosting frontend URL"
  value       = "https://trip-diary.web.app"
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.main.name
}

output "architecture_info" {
  description = "Architecture information"
  value = {
    frontend = "Firebase Hosting (trip-diary.web.app)"
    backend  = "Cloud Run (serverless containers)"
    database = "Firestore (native mode)"
    benefits = [
      "Pay only for actual usage",
      "Scales to zero when idle",
      "Firebase Hosting free tier (10GB storage, 360MB/day)",
      "Firestore free tier (1GB storage, 50K reads/day)",
      "Cloud Run free tier (2M requests/month)",
    ]
  }
}
