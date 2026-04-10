# Firebase project (links existing GCP project to Firebase)
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.apis["firebase.googleapis.com"]]
}

# Firebase Hosting site
resource "google_firebase_hosting_site" "frontend" {
  provider = google-beta
  project  = var.project_id
  site_id  = "trip-diary"

  depends_on = [
    google_firebase_project.default,
    google_project_service.apis["firebasehosting.googleapis.com"],
  ]
}
