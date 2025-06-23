from typing import Any, Dict, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic models"""
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetJsonSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ])

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}


class MongoBaseModel(BaseModel):
    """Base model for MongoDB documents"""
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Place(BaseModel):
    """Place model for locations"""
    name: str
    address: str = ""
    coordinates: Dict[str, Any] = Field(default_factory=dict)
    place_id: str = ""
    types: list[str] = Field(default_factory=list)
    rating: float = 0.0
    photos: list[str] = Field(default_factory=list)


class FlightInfo(BaseModel):
    """Flight information model"""
    airline: str
    flightNumber: str
    departure: Dict[str, Any] = Field(default_factory=dict)  # airport, airportCode, time, terminal, gate
    arrival: Dict[str, Any] = Field(default_factory=dict)    # airport, airportCode, time, terminal, gate
    duration: Optional[str] = None
    aircraft: Optional[str] = None
    seatNumber: Optional[str] = None
    bookingReference: Optional[str] = None
    status: Optional[str] = "scheduled"


class ItineraryItem(BaseModel):
    """Itinerary item model"""
    place: Place
    date: str
    start_time: str = ""
    end_time: str = ""
    estimated_duration: int = 60  # minutes
    notes: str = ""
    order: int = 0
    is_custom: bool = False
    custom_title: str = ""
    custom_description: str = ""
    # Flight-specific information
    flightInfo: Optional[FlightInfo] = None


class Collaborator(BaseModel):
    """Collaborator model"""
    user_id: str
    role: str = "viewer"  # viewer, editor, admin
    invited_at: str
    accepted_at: str = ""
    status: str = "pending"  # pending, accepted, declined
