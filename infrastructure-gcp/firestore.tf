# Firestore Database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis["firestore.googleapis.com"]]
}

# Firestore indexes for efficient queries

# Users: query by email
resource "google_firestore_index" "users_email" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "users"

  fields {
    field_path = "email"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}

# Users: query by username
resource "google_firestore_index" "users_username" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "users"

  fields {
    field_path = "username"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}

# Trips: query by user_id + created_at (descending)
resource "google_firestore_index" "trips_user_created" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "trips"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

# Trips: query by user_id + status
resource "google_firestore_index" "trips_user_status" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "trips"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

# Sessions: query by user_id
resource "google_firestore_index" "sessions_user" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "sessions"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}
