"""
Migrate DynamoDB JSON data dump to Firestore.

Usage:
    python import_to_firestore.py

Reads from: /workshop/travel-diary-app/data-dump/
Writes to:  Firestore collections (users, trips, sessions)
"""

import json
import os
from google.cloud import firestore

PROJECT_ID = "jean-project-492204"
DATA_DIR = "/workshop/travel-diary-app/data-dump"


def dynamo_to_python(obj):
    """Recursively convert DynamoDB JSON format to plain Python objects."""
    if isinstance(obj, dict):
        if len(obj) == 1:
            key = list(obj.keys())[0]
            val = obj[key]
            if key == "S":
                return val
            elif key == "N":
                # Return int or float as appropriate
                return float(val) if "." in val else int(val)
            elif key == "BOOL":
                return val
            elif key == "NULL":
                return None
            elif key == "L":
                return [dynamo_to_python(item) for item in val]
            elif key == "M":
                return {k: dynamo_to_python(v) for k, v in val.items()}
            elif key == "SS":
                return val  # String set -> list
            elif key == "NS":
                return [float(x) if "." in x else int(x) for x in val]
        # Regular dict (not a DynamoDB type wrapper)
        return {k: dynamo_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [dynamo_to_python(item) for item in obj]
    return obj


def load_dynamo_json(filename):
    """Load a DynamoDB JSON dump file and convert to plain Python."""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath) as f:
        data = json.load(f)

    # Handle both list and dict with Items key
    if isinstance(data, dict):
        items = data.get("Items", [data])
    else:
        items = data

    return [dynamo_to_python(item) for item in items]


def migrate_users(db):
    """Migrate users from DynamoDB dump to Firestore."""
    users = load_dynamo_json("travel-diary-prod-users-serverless.json")
    collection = db.collection("users")

    print(f"Migrating {len(users)} users...")
    for user in users:
        user_id = user["id"]
        doc = {
            "id": user_id,
            "email": user.get("email", ""),
            "username": user.get("name", ""),
            "full_name": user.get("name", ""),
            "hashed_password": user.get("password_hash", ""),
            "is_active": user.get("is_active", True),
            "profile": user.get("profile", {}),
            "created_at": user.get("created_at", ""),
            "updated_at": user.get("updated_at", user.get("created_at", "")),
        }
        collection.document(user_id).set(doc)
        print(f"  User: {doc['email']}")

    print(f"  Done: {len(users)} users migrated.")


def migrate_trips(db):
    """Migrate trips from DynamoDB dump to Firestore."""
    trips = load_dynamo_json("travel-diary-prod-trips-serverless.json")
    collection = db.collection("trips")

    print(f"Migrating {len(trips)} trips...")
    for trip in trips:
        trip_id = trip["id"]
        doc = {
            "id": trip_id,
            "user_id": trip.get("user_id", ""),
            "title": trip.get("title", ""),
            "description": trip.get("description", ""),
            "destination": trip.get("destination", ""),
            "start_date": trip.get("start_date", ""),
            "end_date": trip.get("end_date", ""),
            "duration": trip.get("duration", 1),
            "status": trip.get("status", "planning"),
            "total_budget": trip.get("budget", {}).get("total", 0) if isinstance(trip.get("budget"), dict) else trip.get("budget", 0),
            "currency": trip.get("budget", {}).get("currency", "USD") if isinstance(trip.get("budget"), dict) else "USD",
            "is_public": trip.get("is_public", False),
            "tags": trip.get("tags", []),
            "collaborators": trip.get("collaborators", []),
            "wishlist": trip.get("wishlist", []),
            "itinerary": trip.get("itinerary", []),
            "share_links": trip.get("share_links", []),
            "dayNotes": trip.get("dayNotes", []),
            "invitations": trip.get("invitations", []),
            "stats": trip.get("stats", {}),
            "created_at": trip.get("created_at", ""),
            "updated_at": trip.get("updated_at", ""),
        }
        collection.document(trip_id).set(doc)
        print(f"  Trip: {doc['title']}")

    print(f"  Done: {len(trips)} trips migrated.")


def migrate_sessions(db):
    """Migrate sessions from DynamoDB dump to Firestore."""
    sessions = load_dynamo_json("travel-diary-prod-sessions-serverless.json")
    collection = db.collection("sessions")

    print(f"Migrating {len(sessions)} sessions...")
    for session in sessions:
        session_id = session["id"]
        doc = {
            "id": session_id,
            "user_id": session.get("user_id", ""),
            "email": session.get("email", ""),
            "created_at": session.get("created_at", ""),
            "expires_at": session.get("expires_at", ""),
        }
        collection.document(session_id).set(doc)

    print(f"  Done: {len(sessions)} sessions migrated.")


def main():
    print(f"=== Migrating DynamoDB data to Firestore ===")
    print(f"Project: {PROJECT_ID}")
    print(f"Source:  {DATA_DIR}")
    print()

    db = firestore.Client(project=PROJECT_ID)

    migrate_users(db)
    print()
    migrate_trips(db)
    print()
    migrate_sessions(db)

    print()
    print("=== Migration complete! ===")


if __name__ == "__main__":
    main()
