from ..core.config import settings
from .user_service import UserService
from .trip_service import TripService
from .dynamodb_service import DynamoDBUserService, DynamoDBTripService

class ServiceFactory:
    @staticmethod
    def get_user_service():
        """Get the appropriate user service based on database type"""
        if settings.DATABASE_TYPE.lower() == "dynamodb":
            return DynamoDBUserService()
        else:
            return UserService()
    
    @staticmethod
    def get_trip_service():
        """Get the appropriate trip service based on database type"""
        if settings.DATABASE_TYPE.lower() == "dynamodb":
            return DynamoDBTripService()
        else:
            return TripService()

# Convenience functions
def get_user_service():
    return ServiceFactory.get_user_service()

def get_trip_service():
    return ServiceFactory.get_trip_service()
