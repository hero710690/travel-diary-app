from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from ..models.trip import Trip, TripCreate, TripUpdate, ItineraryUpdate, WishlistUpdate
from ..models.user import User
from ..services.service_factory import get_trip_service
from ..database import get_database
from .auth import get_current_user

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("/", response_model=List[Trip])
async def get_user_trips(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all trips for the current user"""
    trip_service = get_trip_service()
    trips = await trip_service.get_user_trips(str(current_user.id), page=(skip // limit) + 1, limit=limit)
    return trips


@router.post("/", response_model=dict)
async def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new trip"""
    trip_service = get_trip_service()
    trip = await trip_service.create_trip(trip_data, str(current_user.id))
    
    return {
        "message": "Trip created successfully",
        "trip": trip
    }


@router.get("/{trip_id}", response_model=dict)
async def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific trip"""
    trip_service = get_trip_service()
    trip = await trip_service.get_trip_by_id(trip_id, str(current_user.id))
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {
        "message": "Trip retrieved successfully",
        "trip": trip
    }


@router.put("/{trip_id}", response_model=dict)
async def update_trip(
    trip_id: str,
    trip_data: TripUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a trip"""
    trip_service = get_trip_service()
    trip = await trip_service.update_trip(trip_id, trip_data, str(current_user.id))
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {
        "message": "Trip updated successfully",
        "trip": trip
    }


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a trip"""
    trip_service = get_trip_service()
    success = await trip_service.delete_trip(trip_id, str(current_user.id))
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {"message": "Trip deleted successfully"}


@router.put("/{trip_id}/itinerary", response_model=dict)
async def update_itinerary(
    trip_id: str,
    itinerary_data: ItineraryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update trip itinerary"""
    trip_service = get_trip_service()
    trip = await trip_service.update_itinerary(trip_id, itinerary_data.itinerary, str(current_user.id))
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {
        "message": "Itinerary updated successfully",
        "itinerary": trip.itinerary
    }


@router.post("/{trip_id}/wishlist", response_model=dict)
async def add_to_wishlist(
    trip_id: str,
    wishlist_data: WishlistUpdate,
    current_user: User = Depends(get_current_user)
):
    """Add place to wishlist"""
    trip_service = get_trip_service()
    trip = await trip_service.update_wishlist(trip_id, wishlist_data.wishlist, str(current_user.id))
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {
        "message": "Place added to wishlist",
        "wishlist": trip.wishlist
    }
