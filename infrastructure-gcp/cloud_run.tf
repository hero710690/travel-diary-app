# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "backend" {
  project       = var.project_id
  location      = var.region
  repository_id = "${var.project_name}-backend"
  format        = "DOCKER"
  labels        = local.common_labels

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

# Cloud Run service account
resource "google_service_account" "cloud_run" {
  project      = var.project_id
  account_id   = "${var.project_name}-run-sa"
  display_name = "Travel Diary Cloud Run Service Account"
}

# Grant Firestore access to Cloud Run service account
resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "backend" {
  project  = var.project_id
  name     = "${var.project_name}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}/api:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "DATABASE_TYPE"
        value = "firestore"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "DEBUG"
        value = "false"
      }
      env {
        name  = "API_V1_STR"
        value = "/api/v1"
      }
      env {
        name  = "PROJECT_NAME"
        value = "Travel Diary API"
      }
      env {
        name  = "VERSION"
        value = "1.0.0"
      }
      env {
        name  = "ALGORITHM"
        value = "HS256"
      }
      env {
        name  = "ACCESS_TOKEN_EXPIRE_MINUTES"
        value = "30"
      }
      env {
        name  = "SECRET_KEY"
        value = var.jwt_secret_key
      }
      env {
        name  = "GOOGLE_MAPS_API_KEY"
        value = var.google_maps_api_key
      }
      env {
        name  = "BACKEND_CORS_ORIGINS"
        value = "[\"https://trip-diary.web.app\",\"https://trip-diary.firebaseapp.com\",\"http://localhost:3000\"]"
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_artifact_registry_repository.backend,
  ]
}

# Allow unauthenticated access to Cloud Run (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
