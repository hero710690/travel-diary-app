from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .common import MongoBaseModel, Place, ItineraryItem, Collaborator


class TripBase(BaseModel):
    """Base trip model"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    destination: str = Field(..., min_length=1, max_length=200)
    start_date: str
    end_date: str
    duration: int = Field(default=1, gt=0)  # days, calculated if not provided
    status: str = Field(default="planning")  # planning, ongoing, completed, cancelled
    is_public: bool = False


class TripCreate(BaseModel):
    """Trip creation model - matches frontend format"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    destination: str = Field(..., min_length=1, max_length=200)
    startDate: str  # Frontend sends camelCase
    endDate: str    # Frontend sends camelCase
    totalBudget: Optional[float] = 0.0
    currency: str = Field(default="USD")
    isPublic: Optional[bool] = False
    tags: Optional[str] = ""

    @validator('startDate', 'endDate')
    def validate_dates(cls, v):
        """Validate date format"""
        try:
            # Try to parse the date to ensure it's valid
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            # If ISO format fails, try other common formats
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD or ISO format.')

    def to_trip_base(self) -> dict:
        """Convert to TripBase format for database storage"""
        # Calculate duration
        try:
            start = datetime.fromisoformat(self.startDate.replace('Z', '+00:00'))
            end = datetime.fromisoformat(self.endDate.replace('Z', '+00:00'))
            duration = (end - start).days + 1
        except:
            try:
                start = datetime.strptime(self.startDate, '%Y-%m-%d')
                end = datetime.strptime(self.endDate, '%Y-%m-%d')
                duration = (end - start).days + 1
            except:
                duration = 1

        return {
            "title": self.title,
            "description": self.description or "",
            "destination": self.destination,
            "start_date": self.startDate,
            "end_date": self.endDate,
            "duration": max(1, duration),
            "status": "planning",
            "is_public": self.isPublic or False,
            "total_budget": self.totalBudget or 0.0,
            "currency": self.currency or "USD"
        }


class TripUpdate(BaseModel):
    """Trip update model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    destination: Optional[str] = Field(None, min_length=1, max_length=200)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[int] = Field(None, gt=0)
    status: Optional[str] = None
    is_public: Optional[bool] = None


class TripInDB(MongoBaseModel, TripBase):
    """Trip model as stored in database"""
    user_id: str
    collaborators: List[Collaborator] = Field(default_factory=list)
    wishlist: List[Place] = Field(default_factory=list)
    itinerary: List[ItineraryItem] = Field(default_factory=list)
    total_budget: float = 0.0
    currency: str = "USD"
    created_at: str
    updated_at: str


class Trip(MongoBaseModel):
    """Trip model for API responses"""
    title: str
    description: str = ""
    destination: str
    start_date: str
    end_date: str
    duration: int
    status: str = "planning"
    is_public: bool = False
    user_id: str
    collaborators: List[Collaborator] = Field(default_factory=list)
    wishlist: List[Place] = Field(default_factory=list)
    itinerary: List[ItineraryItem] = Field(default_factory=list)
    total_budget: float = 0.0
    currency: str = "USD"
    created_at: str
    updated_at: str


class ItineraryUpdate(BaseModel):
    """Itinerary update model"""
    itinerary: List[ItineraryItem]


class WishlistUpdate(BaseModel):
    """Wishlist update model"""
    place: Place
