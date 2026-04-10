# Get the Cloud Build service account
data "google_project" "current" {
  project_id = var.project_id
}

locals {
  cloudbuild_sa = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

# Cloud Build needs permission to deploy to Cloud Run
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = local.cloudbuild_sa
}

# Cloud Build needs permission to act as the Cloud Run service account
resource "google_service_account_iam_member" "cloudbuild_act_as" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = local.cloudbuild_sa
}

# Cloud Build needs permission to push to Artifact Registry
resource "google_project_iam_member" "cloudbuild_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = local.cloudbuild_sa
}

# Cloud Build needs permission to deploy to Firebase Hosting
resource "google_project_iam_member" "cloudbuild_firebase" {
  project = var.project_id
  role    = "roles/firebasehosting.admin"
  member  = local.cloudbuild_sa
}

# Cloud Build trigger (optional - connects to a Git repo)
# Uncomment and configure if using a connected repository
#
# resource "google_cloudbuild_trigger" "deploy" {
#   project  = var.project_id
#   name     = "${var.project_name}-deploy"
#   location = var.region
#
#   github {
#     owner = "your-github-username"
#     name  = "travel-diary-app-gcp"
#     push {
#       branch = "^main$"
#     }
#   }
#
#   filename = "cloudbuild.yaml"
#
#   substitutions = {
#     _JWT_SECRET_KEY      = var.jwt_secret_key
#     _GOOGLE_MAPS_API_KEY = var.google_maps_api_key
#   }
# }
