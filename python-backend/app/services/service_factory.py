from ..core.config import settings
from .user_service import UserService
from .trip_service import TripService
from .dynamodb_service import DynamoDBUserService, DynamoDBTripService
from .firestore_service import FirestoreUserService, FirestoreTripService

class ServiceFactory:
    @staticmethod
    def get_user_service():
        """Get the appropriate user service based on database type"""
        db_type = settings.DATABASE_TYPE.lower()
        if db_type == "dynamodb":
            return DynamoDBUserService()
        elif db_type == "firestore":
            return FirestoreUserService()
        else:
            return UserService()

    @staticmethod
    def get_trip_service():
        """Get the appropriate trip service based on database type"""
        db_type = settings.DATABASE_TYPE.lower()
        if db_type == "dynamodb":
            return DynamoDBTripService()
        elif db_type == "firestore":
            return FirestoreTripService()
        else:
            return TripService()

# Convenience functions
def get_user_service():
    return ServiceFactory.get_user_service()

def get_trip_service():
    return ServiceFactory.get_trip_service()
