import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, addDays, differenceInDays } from 'date-fns';
import { tripsService } from '../services/trips';
import { Trip, ItineraryItem, FlightInfo } from '../types';
import { safeParseDate, addDaysToDate, getDaysDifferenceIgnoreTime, combineDateAndTime } from '../utils/dateUtils';
import GoogleMap from '../components/GoogleMap';
import PlacesSearch from '../components/PlacesSearch';
import HotelSearch from '../components/HotelSearch';
import FlightForm from '../components/FlightForm';
import DraggablePlace from '../components/DraggablePlace';
import ItineraryDay from '../components/ItineraryDay';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  MapIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  EyeIcon,
  PencilIcon as PencilIconOutline,
  BuildingOfficeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: google.maps.LatLng;
  };
  photos?: google.maps.places.PlacePhoto[];
  rating?: number;
  types?: string[];
  user_ratings_total?: number;
  vicinity?: string;
  address_components?: google.maps.GeocoderAddressComponent[];
  plus_code?: google.maps.places.PlacePlusCode;
  business_status?: string;
  editorial_summary?: string;
}

// Hotel Form Component
const HotelFormComponent: React.FC<{
  onSubmit: (hotelInfo: any) => void;
  onCancel: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
}> = ({ onSubmit, onCancel, tripStartDate, tripEndDate }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    checkInDate: tripStartDate || '',
    checkOutDate: tripEndDate || '',
    nights: 1,
    roomType: '',
    confirmationNumber: '',
    phone: '',
    rating: 0,
    pricePerNight: '',
    totalPrice: '',
    coordinates: undefined as { lat: number; lng: number } | undefined
  });
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const handleHotelSelect = (hotel: any) => {
    console.log('Selected hotel:', hotel);
    setSelectedPlace(hotel);
    setFormData(prev => ({
      ...prev,
      name: hotel.name,
      address: hotel.formatted_address,
      rating: hotel.rating || 0,
      coordinates: hotel.geometry?.location ? {
        lat: hotel.geometry.location.lat(),
        lng: hotel.geometry.location.lng()
      } : undefined
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address) {
      toast.error('Please select a hotel from the search results');
      return;
    }
    
    // Calculate nights
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      toast.error('Check-out date must be after check-in date');
      return;
    }
    
    const hotelInfo = {
      ...formData,
      nights,
      pricePerNight: formData.pricePerNight ? parseFloat(formData.pricePerNight) : undefined,
      totalPrice: formData.totalPrice ? parseFloat(formData.totalPrice) : undefined
    };
    
    onSubmit(hotelInfo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 text-left mb-1">
          Search & Select Hotel *
        </label>
        <HotelSearch
          onHotelSelect={handleHotelSelect}
          placeholder="Search for hotels..."
          className="w-full"
        />
        {selectedPlace && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{selectedPlace.name}</h4>
                  {selectedPlace.rating && (
                    <div className="flex items-center">
                      <span className="text-xs text-yellow-600 font-medium">
                        ⭐ {selectedPlace.rating}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{selectedPlace.formatted_address}</p>
                {selectedPlace.price_level && (
                  <div className="mt-1">
                    <span className="text-xs text-green-600">
                      {'$'.repeat(selectedPlace.price_level)} Price Level
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Check-in Date *
          </label>
          <input
            type="date"
            required
            value={formData.checkInDate}
            onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Check-out Date *
          </label>
          <input
            type="date"
            required
            value={formData.checkOutDate}
            onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Room Type
          </label>
          <select
            value={formData.roomType}
            onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select room type</option>
            <option value="Standard Room">Standard Room</option>
            <option value="Deluxe Room">Deluxe Room</option>
            <option value="Suite">Suite</option>
            <option value="Executive Room">Executive Room</option>
            <option value="Family Room">Family Room</option>
            <option value="Single Room">Single Room</option>
            <option value="Double Room">Double Room</option>
            <option value="Twin Room">Twin Room</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Total Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.totalPrice}
            onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Price per Night ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.pricePerNight}
            onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Confirmation Number
          </label>
          <input
            type="text"
            value={formData.confirmationNumber}
            onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter confirmation number"
          />
        </div>
      </div>

      {formData.checkInDate && formData.checkOutDate && (
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="text-sm text-gray-600">
            <strong>Stay Duration:</strong> {
              Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
            } night{Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
          </div>
          {formData.pricePerNight && (
            <div className="text-sm text-gray-600 mt-1">
              <strong>Estimated Total:</strong> ${(
                parseFloat(formData.pricePerNight) * 
                Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
              ).toFixed(2)}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Hotel Stay
        </button>
      </div>
    </form>
  );
};

const TripPlanningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lng: 2.3522 }); // Default to Paris
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Collaborative Editing State
  const [activeCollaborators, setActiveCollaborators] = useState<Array<{
    id: string;
    name: string;
    email: string;
    color: string;
    lastSeen: Date;
    currentlyEditing?: string; // item ID they're editing
  }>>([]);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);

  // Hotel Stay State
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelStays, setHotelStays] = useState<Array<{
    id: string;
    hotelInfo: any; // HotelInfo type
    startDay: number;
    endDay: number;
  }>>([]);

  // Flight State
  const [showFlightModal, setShowFlightModal] = useState(false);

  // Fetch trip data
  const { data: tripData, isLoading } = useQuery(
    ['trip', id],
    () => tripsService.getTrip(id!),
    {
      enabled: !!id,
      onSuccess: (trip) => {
        
        // Transform backend itinerary to frontend format
        if (trip.itinerary && trip.itinerary.length > 0) {
          const transformedItinerary = trip.itinerary.map((item: any, index: number) => {
            // Prioritize explicit day field, fallback to date calculation
            let dayNumber;
            
            if (item.day && typeof item.day === 'number' && item.day > 0) {
              // Use explicit day field if available
              dayNumber = item.day;
              console.log('📅 Using explicit day field:', dayNumber, 'for item:', item.custom_title || item.place?.name);
            } else {
              // Calculate day number from date using safe date parsing (fallback)
              const tripStartDate = safeParseDate(trip.startDate || (trip as any).start_date);
              const itemDate = safeParseDate(item.date);
              
              // Use the new utility function to avoid timezone issues
              const dayDifference = getDaysDifferenceIgnoreTime(tripStartDate, itemDate);
              // Ensure day number is at least 1, even if the item date is before trip start
              dayNumber = Math.max(1, dayDifference + 1);
              
              console.log('📅 Day calculation debug (fallback):', {
                tripStartDate: tripStartDate.toISOString(),
                itemDate: itemDate.toISOString(),
                tripStartDateLocal: tripStartDate.toString(),
                itemDateLocal: itemDate.toString(),
                dayDifference,
                calculatedDay: dayNumber,
                itemIndex: index,
                itemTitle: item.custom_title || item.place?.name
              });
            }

            // Check if this is a flight item
            const isFlightItem = item.flightInfo || (item.place?.types && item.place.types.includes('flight'));
            
            console.log('🔍 Loading item debug:', {
              itemIndex: index,
              hasFlightInfo: !!item.flightInfo,
              placeTypes: item.place?.types,
              isFlightItem,
              customTitle: item.custom_title,
              placeName: item.place?.name
            });

            // Generate a unique ID if _id is not available
            const itemId = item._id || item.id || `${item.place?.place_id || 'item'}_${index}_${Date.now()}`;

            return {
              id: itemId,
              day: dayNumber,
              time: item.start_time || '09:00',
              title: item.custom_title || item.place?.name || 'Activity',
              description: item.custom_description || item.place?.address || '',
              location: {
                name: item.place?.name || '',
                address: item.place?.address || '',
                coordinates: item.place?.coordinates || undefined,
              },
              duration: item.estimated_duration || (isFlightItem ? 120 : 60),
              type: isFlightItem ? 'flight' as const : 'activity' as const,
              notes: item.notes || '',
              userRating: item.userRating || undefined, // ✅ FIXED: Include user rating from backend
              // Include flight info if available
              flightInfo: item.flightInfo || undefined,
            };
          });
          
          console.log('📥 Loaded and transformed itinerary:', transformedItinerary);
          setItinerary(transformedItinerary);
        } else {
          console.log('📥 No itinerary data found, setting empty array');
          setItinerary([]);
        }
        
        // Set map center based on destination
        if (trip.destination) {
          console.log('🗺️ Setting map center for destination:', trip.destination);
          geocodeDestination(trip.destination);
        }
      },
    }
  );

  // Update itinerary mutation
  const updateItineraryMutation = useMutation(
    (transformedItinerary: any[]) => tripsService.updateItinerary(id!, transformedItinerary),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['trip', id]);
        toast.success('Itinerary updated successfully!');
      },
      onError: (error: any) => {
        console.error('❌ Itinerary save error:', error);
        const message = error.response?.data?.message || 'Failed to update itinerary';
        toast.error(`Server error while saving itinerary: ${message}`);
      },
    }
  );

  const geocodeDestination = (destination: string) => {
    console.log('🔍 Attempting to geocode destination:', destination);
    
    const attemptGeocode = () => {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        console.log('✅ Google Maps Geocoder available');
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({ address: destination }, (results, status) => {
          console.log('📍 Geocoding result:', status, results);
          
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const newCenter = {
              lat: location.lat(),
              lng: location.lng(),
            };
            
            console.log('🎯 Setting map center to:', newCenter);
            setMapCenter(newCenter);
            setIsMapReady(true);
            
            // Also log the formatted address
            console.log('📍 Geocoded address:', results[0].formatted_address);
          } else {
            console.error('❌ Geocoding failed:', status);
            // Fallback to default location for the destination
            setDefaultLocationForDestination(destination);
          }
        });
      } else {
        console.log('⏳ Google Maps not ready, retrying in 1 second...');
        setTimeout(attemptGeocode, 1000);
      }
    };

    attemptGeocode();
  };

  const setDefaultLocationForDestination = (destination: string) => {
    // Set reasonable defaults for common destinations
    const dest = destination.toLowerCase();
    let defaultCenter = { lat: 48.8566, lng: 2.3522 }; // Paris default
    
    if (dest.includes('paris')) {
      defaultCenter = { lat: 48.8566, lng: 2.3522 };
    } else if (dest.includes('london')) {
      defaultCenter = { lat: 51.5074, lng: -0.1278 };
    } else if (dest.includes('new york') || dest.includes('nyc')) {
      defaultCenter = { lat: 40.7128, lng: -74.0060 };
    } else if (dest.includes('tokyo')) {
      defaultCenter = { lat: 35.6762, lng: 139.6503 };
    } else if (dest.includes('rome')) {
      defaultCenter = { lat: 41.9028, lng: 12.4964 };
    } else if (dest.includes('barcelona')) {
      defaultCenter = { lat: 41.3851, lng: 2.1734 };
    } else if (dest.includes('amsterdam')) {
      defaultCenter = { lat: 52.3676, lng: 4.9041 };
    } else if (dest.includes('berlin')) {
      defaultCenter = { lat: 52.5200, lng: 13.4050 };
    }
    
    console.log('🗺️ Using default location for', destination, ':', defaultCenter);
    setMapCenter(defaultCenter);
    setIsMapReady(true);
  };

  const handlePlaceSelect = (place: Place) => {
    console.log('🎯 TripPlanningPage: Place selected from', place.name ? 'MAP/SEARCH' : 'UNKNOWN');
    console.log('🎯 Place data received:', {
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      types: place.types,
      source: place.name && place.rating ? 'COMPLETE_DATA' : 'INCOMPLETE_DATA'
    });
    
    setSelectedPlaces(prev => {
      const exists = prev.find(p => p.place_id === place.place_id);
      
      if (!exists) {
        console.log('✅ Adding new place to selected places:', place.name);
        console.log('✅ Place will show with rating:', place.rating ? `${place.rating} stars` : 'No rating');
        return [...prev, place];
      } else {
        console.log('⚠️ Place already exists:', place.name);
        return prev;
      }
    });

    // Update map center to selected place
    if (place.geometry?.location) {
      setMapCenter({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    }
  };

  const handleMapPlaceSelect = (place: any) => {
    console.log('🗺️ Map place selected (RAW DATA):', place);
    console.log('🗺️ Comparing to search format - Name:', place?.name, 'Rating:', place?.rating, 'Types:', place?.types);
    
    // Don't process if we don't have a valid place_id
    if (!place?.place_id) {
      console.log('❌ No valid place_id found, skipping place selection');
      return;
    }
    
    // Create place object that matches the search data format exactly
    const newPlace: Place = {
      place_id: place.place_id,
      name: place.name || place.vicinity || place.formatted_address || 'Unknown Location',
      formatted_address: place.formatted_address || place.vicinity || '',
      geometry: place.geometry,
      rating: place.rating, // Direct pass-through like search
      types: place.types || [],
      user_ratings_total: place.user_ratings_total,
      vicinity: place.vicinity,
      address_components: place.address_components,
      plus_code: place.plus_code,
      business_status: place.business_status,
      editorial_summary: (place as any)?.editorial_summary,
    };
    
    console.log('🗺️ Final place object (SHOULD MATCH SEARCH FORMAT):', {
      name: newPlace.name,
      rating: newPlace.rating,
      types: newPlace.types,
      user_ratings_total: newPlace.user_ratings_total
    });
    
    console.log('🗺️ Calling handlePlaceSelect with processed place');
    handlePlaceSelect(newPlace);
  };

  const generateDays = () => {
    if (!tripData) return [];
    
    const trip = tripData;
    
    // Handle different date formats from backend
    let startDate: Date;
    let endDate: Date;
    
    try {
      // Frontend uses camelCase, backend uses snake_case
      const startDateStr = trip.startDate || (trip as any).start_date;
      const endDateStr = trip.endDate || (trip as any).end_date;
      
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
      
      // If invalid dates, try parsing as YYYY-MM-DD
      if (isNaN(startDate.getTime())) {
        startDate = new Date(startDateStr + 'T00:00:00');
      }
      if (isNaN(endDate.getTime())) {
        endDate = new Date(endDateStr + 'T00:00:00');
      }
      
      // Fallback to duration if dates still invalid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        startDate = new Date();
        endDate = new Date();
        const duration = (trip as any).duration || 7;
        endDate.setDate(startDate.getDate() + duration - 1);
      }
    } catch (error) {
      console.error('Date parsing error:', error);
      // Fallback dates
      startDate = new Date();
      endDate = new Date();
      const duration = (trip as any).duration || 7;
      endDate.setDate(startDate.getDate() + duration - 1);
    }
    
    const dayCount = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    return Array.from({ length: dayCount }, (_, index) => ({
      date: addDays(startDate, index),
      dayNumber: index + 1,
    }));
  };

  const handleDropToDay = (place: Place, dayNumber: number) => {
    const newItineraryItem: ItineraryItem = {
      id: `${place.place_id}_${dayNumber}_${Date.now()}`,
      day: dayNumber,
      time: '09:00',
      title: place.name,
      description: place.formatted_address,
      location: {
        name: place.name,
        address: place.formatted_address,
        coordinates: place.geometry?.location ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        } : undefined,
      },
      duration: 60, // Default 1 hour
      type: 'activity',
      place: place, // Preserve the full place data including rating and types
    };

    setItinerary(prev => [...prev, newItineraryItem]);
  };

  const handleRemoveFromItinerary = (itemId: string) => {
    setItinerary(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateItineraryItem = (itemId: string, updates: Partial<ItineraryItem>) => {
    console.log('🔄 handleUpdateItineraryItem called:', itemId, updates);
    
    // Find the current item before update
    const currentItem = itinerary.find(item => item.id === itemId);
    console.log('📋 Current item before update:', currentItem);
    
    // Update local state immediately for responsive UI
    const updatedItinerary = itinerary.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    const updatedItem = updatedItinerary.find(item => item.id === itemId);
    console.log('📝 Updated item after merge:', updatedItem);
    console.log('🎯 Specifically userRating:', updatedItem?.userRating);
    
    setItinerary(updatedItinerary);

    // Transform and save to database
    const transformedItinerary = updatedItinerary.map(item => ({
      _id: item.id,
      day: item.day,
      date: item.date,
      start_time: item.time,
      custom_title: item.title,
      description: item.description,
      estimated_duration: item.duration,
      type: item.type,
      notes: item.notes,
      userRating: item.userRating, // Include user rating
      // Include flight info if present
      ...(item.flightInfo && { flightInfo: item.flightInfo }),
      // Include place info if present
      ...(item.place && { place: item.place })
    }));
    
    const transformedItem = transformedItinerary.find(item => item._id === itemId);
    console.log('🚀 Transformed item for DB:', transformedItem);
    console.log('💾 DB userRating:', transformedItem?.userRating);
    
    updateItineraryMutation.mutate(transformedItinerary);

    // Show success message for wish level updates
    if (updates.userRating !== undefined) {
      toast.success(`Wish level set to ${updates.userRating} heart${updates.userRating > 1 ? 's' : ''}!`);
    }
  };

  const handleMoveItineraryItem = (itemId: string, newDay: number) => {
    setItinerary(prev => prev.map(item => 
      item.id === itemId ? { ...item, day: newDay } : item
    ));
  };

  // Unified handleAddFlight function to work with both ItineraryDay and FlightForm
  const handleAddFlight = (
    dayNumberOrFlightInfo: number | any, 
    flightInfoOrTime?: any | string, 
    time?: string
  ) => {
    let newFlightItem: ItineraryItem;
    
    if (typeof dayNumberOrFlightInfo === 'number') {
      // Old signature: (dayNumber: number, flightInfo: any, time: string) - from ItineraryDay
      const dayNumber = dayNumberOrFlightInfo;
      const flightInfo = flightInfoOrTime as any;
      const flightTime = time as string;
      
      newFlightItem = {
        id: `flight_${dayNumber}_${Date.now()}`,
        day: dayNumber,
        time: flightTime,
        title: `${flightInfo.airline} ${flightInfo.flightNumber}`,
        description: `${flightInfo.departure.airportCode} → ${flightInfo.arrival.airportCode}`,
        location: {
          name: `${flightInfo.departure.airport} to ${flightInfo.arrival.airport}`,
          address: `${flightInfo.departure.airportCode} → ${flightInfo.arrival.airportCode}`,
          coordinates: undefined,
        },
        duration: flightInfo.duration ? parseInt(flightInfo.duration.replace(/[^\d]/g, '')) * 60 : 120,
        type: 'flight',
        flightInfo: flightInfo,
        notes: flightInfo.bookingReference ? `Booking: ${flightInfo.bookingReference}` : '',
      };
    } else {
      // New signature: (flightInfo: any) - from FlightForm
      const flightInfo = dayNumberOrFlightInfo;
      const tripStartDate = tripData?.startDate || new Date().toISOString();
      
      // Use arrival date for day calculation (since trip starts in arrival country)
      const arrivalDate = flightInfo.arrival.date;
      const dayNumber = calculateDayNumber(arrivalDate, tripStartDate);
      
      console.log('✈️ Flight day calculation:', {
        flightNumber: `${flightInfo.airline} ${flightInfo.flightNumber}`,
        departureDate: flightInfo.departure.date,
        arrivalDate: flightInfo.arrival.date,
        tripStartDate,
        calculatedDay: dayNumber
      });
      
      // Ensure airport codes and names are properly set
      const departureDisplay = flightInfo.departure.airportCode || flightInfo.departure.airport || 'Unknown';
      const arrivalDisplay = flightInfo.arrival.airportCode || flightInfo.arrival.airport || 'Unknown';
      
      newFlightItem = {
        id: `flight_${Date.now()}`,
        day: dayNumber,
        time: flightInfo.arrival.time, // Use arrival time for sorting
        title: `${flightInfo.airline} ${flightInfo.flightNumber}`,
        description: `${departureDisplay} → ${arrivalDisplay}`,
        location: {
          name: `${flightInfo.arrival.airport} - Arrival`,
          address: flightInfo.arrival.airport,
          coordinates: undefined,
        },
        duration: flightInfo.duration ? parseInt(flightInfo.duration.replace(/[^\d]/g, '')) * 60 : 120,
        type: 'flight',
        flightInfo: {
          airline: flightInfo.airline,
          flightNumber: flightInfo.flightNumber,
          departure: {
            airport: flightInfo.departure.airport || '',
            airportCode: flightInfo.departure.airportCode || '', // ✅ Fixed: was using .airport
            date: flightInfo.departure.date, // ✅ Save departure date
            time: flightInfo.departure.time
          },
          arrival: {
            airport: flightInfo.arrival.airport || '',
            airportCode: flightInfo.arrival.airportCode || '', // ✅ Fixed: was using .airport
            date: flightInfo.arrival.date, // ✅ Save arrival date
            time: flightInfo.arrival.time
          },
          duration: flightInfo.duration,
          aircraft: flightInfo.aircraft,
          bookingReference: flightInfo.bookingReference
        },
        notes: `Flight from ${departureDisplay} to ${arrivalDisplay}${flightInfo.bookingReference ? ` (Confirmation: ${flightInfo.bookingReference})` : ''}`
      };
      
      setShowFlightModal(false);
      toast.success(`Flight ${flightInfo.airline} ${flightInfo.flightNumber} added to Day ${dayNumber}`);
    }

    setItinerary(prev => [...prev, newFlightItem]);
    
    if (typeof dayNumberOrFlightInfo === 'number') {
      toast.success('Flight added to itinerary!');
    }
  };

  const handleSaveItinerary = () => {
    if (!tripData) {
      toast.error('Trip data not available');
      return;
    }

    if (!id) {
      toast.error('Trip ID is missing');
      console.error('❌ Trip ID is missing:', { id, tripData });
      return;
    }

    console.log('🔍 Save itinerary debug:', {
      tripId: id,
      tripData: tripData,
      itineraryLength: itinerary.length
    });

    // Transform the itinerary to match backend schema
    const transformedItinerary = itinerary.map((item, index) => {
      // Calculate the actual date based on trip start date and day number
      const tripStartDateValue = tripData?.startDate;
      console.log('🔍 Trip start date value:', tripStartDateValue);
      
      const tripStartDate = safeParseDate(tripStartDateValue);
      console.log('🔍 Parsed trip start date:', tripStartDate, 'isValid:', !isNaN(tripStartDate.getTime()));
      
      // Add comprehensive debugging
      console.log('🔍 Timezone debugging:', {
        tripStartDateValue,
        tripStartDateParsed: tripStartDate.toISOString(),
        tripStartDateLocal: tripStartDate.toString(),
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset()
      });
      
      const itemDate = addDaysToDate(tripStartDate, item.day - 1);
      const combinedDateTime = combineDateAndTime(itemDate, item.time);
      
      console.log('🔍 Save calculation debug:', {
        itemId: item.id,
        itemDay: item.day,
        itemTime: item.time,
        tripStartDate: tripStartDate.toISOString(),
        calculatedDate: itemDate.toISOString(),
        combinedDateTime: combinedDateTime.toISOString(),
        dayOffset: item.day - 1
      });

      // Handle flight items differently
      if (item.type === 'flight' && item.flightInfo) {
        console.log('🔍 Saving flight item:', {
          itemId: item.id,
          title: item.title,
          hasFlightInfo: !!item.flightInfo,
          flightInfo: item.flightInfo
        });
        
        // For flights, use the arrival date/time from flightInfo instead of combineDateAndTime
        const arrivalDate = item.flightInfo.arrival.date;
        const arrivalTime = item.flightInfo.arrival.time;
        const flightDateTime = new Date(`${arrivalDate}T${arrivalTime}:00.000Z`);
        
        return {
          place: {
            name: item.title,
            address: item.description || '',
            coordinates: {}, // Use empty object instead of null
            place_id: item.id,
            types: ['flight'],
            rating: 0,
            photos: [] // Add missing photos field
          },
          date: flightDateTime.toISOString(),
          day: item.day, // ✅ FIXED: Preserve original day number
          start_time: item.time,
          end_time: item.time,
          estimated_duration: item.duration || 120,
          notes: item.notes || '',
          userRating: item.userRating,
          order: index,
          is_custom: true,
          custom_title: item.title,
          custom_description: item.description || '',
          // Store flight info for backend
          flightInfo: item.flightInfo
        };
      }

      // Handle regular activity items
      return {
        place: {
          name: item.title,
          address: item.description || item.location?.address || '',
          coordinates: item.location?.coordinates || {}, // Use empty object instead of null
          place_id: item.id,
          types: [],
          rating: 0,
          photos: [] // Add missing photos field
        },
        date: combinedDateTime.toISOString(),
        day: item.day, // ✅ FIXED: Preserve original day number
        start_time: item.time,
        end_time: item.time, // Could calculate based on duration
        estimated_duration: item.duration || 60,
        notes: item.notes || '',
        userRating: item.userRating,
        order: index,
        is_custom: true,
        custom_title: item.title,
        custom_description: item.description || ''
      };
    }).filter(item => item !== null); // Remove any null items from validation failures

    // Check if we have any valid items to save
    if (transformedItinerary.length === 0) {
      toast.error('No valid itinerary items to save');
      return;
    }

    console.log('🔄 Saving transformed itinerary:', transformedItinerary);
    updateItineraryMutation.mutate(transformedItinerary);
  };

  // Collaborative Editing Functions
  const initializeCollaborativeMode = () => {
    // TODO: Replace with actual WebSocket connection when backend is ready
    console.log('Initializing collaborative mode for trip:', id);
    
    // Mock collaborative users
    const mockCollaborators = [
      {
        id: 'user1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        color: '#3B82F6', // blue
        lastSeen: new Date(),
      },
      {
        id: 'user2', 
        name: 'Bob Smith',
        email: 'bob@example.com',
        color: '#10B981', // green
        lastSeen: new Date(Date.now() - 30000), // 30 seconds ago
      }
    ];
    
    setActiveCollaborators(mockCollaborators);
    setIsCollaborativeMode(true);
    toast.success('Collaborative mode enabled');
  };

  const handleCollaborativeEdit = (itemId: string, updates: Partial<ItineraryItem>) => {
    // Mark as pending change for real-time sync
    setPendingChanges(prev => [...prev, itemId]);
    
    // Update local state immediately for responsive UI
    handleUpdateItineraryItem(itemId, updates);
    
    // TODO: Send change to other collaborators via WebSocket
    console.log('Broadcasting change:', { itemId, updates });
    
    // Simulate network delay and remove from pending
    setTimeout(() => {
      setPendingChanges(prev => prev.filter(id => id !== itemId));
      setLastSyncTime(new Date());
    }, 500);
  };

  const handleCollaboratorCursorMove = (collaboratorId: string, itemId?: string) => {
    setActiveCollaborators(prev => prev.map(collab => 
      collab.id === collaboratorId 
        ? { ...collab, currentlyEditing: itemId, lastSeen: new Date() }
        : collab
    ));
  };

  const getCollaboratorEditingItem = (itemId: string) => {
    return activeCollaborators.find(collab => collab.currentlyEditing === itemId);
  };

  // Initialize collaborative mode on component mount
  useEffect(() => {
    if (tripData && !isCollaborativeMode) {
      // Auto-enable collaborative mode if trip has collaborators
      // TODO: Check actual collaborator status from backend
      const hasCollaborators = Math.random() > 0.5; // Mock condition
      if (hasCollaborators) {
        initializeCollaborativeMode();
      }
    }
  }, [tripData, isCollaborativeMode]);

  // Hotel Stay Functions
  // Utility function for consistent day calculation
  const calculateDayNumber = (itemDate: string, tripStartDate: string): number => {
    try {
      // Use date strings directly and create UTC dates to avoid timezone issues
      const tripStartStr = tripStartDate.split('T')[0]; // Get YYYY-MM-DD part
      const itemDateStr = itemDate.split('T')[0]; // Get YYYY-MM-DD part
      
      // Create UTC dates to avoid timezone shifts
      const tripStart = new Date(tripStartStr + 'T00:00:00.000Z');
      const itemDay = new Date(itemDateStr + 'T00:00:00.000Z');
      
      // Calculate the difference in days
      const timeDiff = itemDay.getTime() - tripStart.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      // Use the date-based calculation, minimum Day 1
      return Math.max(1, daysDiff + 1);
    } catch (error) {
      console.error('Error calculating day number:', error);
      return 1;
    }
  };

  const handleAddHotel = (hotelInfo: any) => {
    const tripStartDate = tripData?.startDate || new Date().toISOString();
    
    // Use consistent day calculation
    const startDay = calculateDayNumber(hotelInfo.checkInDate, tripStartDate);
    const endDay = calculateDayNumber(hotelInfo.checkOutDate, tripStartDate);
    
    console.log('🏨 Hotel day calculation:', {
      hotelName: hotelInfo.name,
      checkInDate: hotelInfo.checkInDate,
      checkOutDate: hotelInfo.checkOutDate,
      tripStartDate,
      startDay,
      endDay
    });
    
    const newHotelStay = {
      id: `hotel_${Date.now()}`,
      hotelInfo,
      startDay,
      endDay
    };
    
    setHotelStays(prev => [...prev, newHotelStay]);
    
    // Add hotel items to itinerary for each day
    const hotelItems: any[] = [];
    for (let day = startDay; day <= endDay; day++) {
      const isFirstDay = day === startDay;
      const isLastDay = day === endDay;
      
      // Calculate the actual date for this day using UTC-safe function
      const tripStart = safeParseDate(tripStartDate);
      const dayDate = addDaysToDate(tripStart, day - 1);
      const dayDateStr = dayDate.toISOString().split('T')[0];
      
      hotelItems.push({
        id: `${newHotelStay.id}_day_${day}`,
        day,
        date: dayDateStr, // Add the actual date
        time: isFirstDay ? '15:00' : isLastDay ? '11:00' : '00:00', // Check-in at 3PM, check-out at 11AM, midnight for continuing stays
        title: hotelInfo.name,
        description: `${hotelInfo.address} - ${isFirstDay ? 'Check-in' : isLastDay ? 'Check-out' : 'Hotel Stay'}`,
        type: 'accommodation',
        // Remove duration for hotel stays since check-in/check-out times are more relevant
        hotelInfo,
        location: {
          name: hotelInfo.name,
          address: hotelInfo.address,
          coordinates: hotelInfo.coordinates
        },
        notes: `${isFirstDay ? 'Check-in' : isLastDay ? 'Check-out' : 'Staying at'} ${hotelInfo.name}${hotelInfo.confirmationNumber ? ` (Confirmation: ${hotelInfo.confirmationNumber})` : ''}`
      });
    }
    
    setItinerary(prev => [...prev, ...hotelItems]);
    setShowHotelModal(false);
    toast.success(`Hotel stay added for ${endDay - startDay + 1} day${endDay - startDay + 1 !== 1 ? 's' : ''}`);
  };

  const handleRemoveHotel = (hotelStayId: string) => {
    // Remove hotel stay from state
    setHotelStays(prev => prev.filter(stay => stay.id !== hotelStayId));
    
    // Remove all related itinerary items
    setItinerary(prev => prev.filter(item => !item.id.startsWith(hotelStayId)));
    
    toast.success('Hotel stay removed');
  };

  const getHotelForDay = (dayNumber: number) => {
    return hotelStays.find(stay => dayNumber >= stay.startDay && dayNumber <= stay.endDay);
  };

  const getMapMarkers = () => {
    return selectedPlaces
      .filter(place => place.geometry?.location)
      .map(place => ({
        position: {
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        },
        title: place.name,
        id: place.place_id,
        rating: place.rating,
        address: place.formatted_address,
        types: place.types,
      }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!tripData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Trip not found</p>
      </div>
    );
  }

  const trip = tripData;
  const days = generateDays();

  // Debug logging
  console.log('Trip data:', trip);
  console.log('Generated days:', days);
  console.log('Days count:', days.length);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 text-left">
          <button
            onClick={() => navigate(`/trips/${id}`)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Trip
          </button>
          
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 text-left">Plan Your Trip</h1>
              <p className="text-gray-600 text-left">{trip.name} - {trip.destination}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHotelModal(true)}
                className="inline-flex items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                Add Hotel
              </button>
              <button
                onClick={() => setShowFlightModal(true)}
                className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Add Flight
              </button>
              <button
                onClick={handleSaveItinerary}
                disabled={updateItineraryMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updateItineraryMutation.isLoading ? 'Saving...' : 'Save Itinerary'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left Panel - Search and Places */}
          <div className="xl:col-span-1 space-y-4 lg:space-y-6">
            {/* Places Search */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 text-left">Search Places</h2>
              <PlacesSearch
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search restaurants, attractions, hotels..."
              />
            </div>

            {/* Selected Places */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 text-left">
                Selected Places ({selectedPlaces.length})
              </h2>
              <div className="space-y-2 max-h-80 lg:max-h-96 overflow-y-auto">
                {selectedPlaces.map((place) => (
                  <DraggablePlace
                    key={place.place_id}
                    place={place}
                    onRemove={() => setSelectedPlaces(prev => 
                      prev.filter(p => p.place_id !== place.place_id)
                    )}
                  />
                ))}
                {selectedPlaces.length === 0 && (
                  <p className="text-gray-500 text-sm text-left">
                    Search and select places to add to your itinerary
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Panel - Map */}
          <div className="xl:col-span-1 lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center text-left">
                <MapIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="truncate">Map View</span>
                {tripData && (
                  <span className="ml-2 text-sm text-gray-500 truncate">
                    - {tripData.destination}
                  </span>
                )}
              </h2>
              {!isMapReady && (
                <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading map for {tripData?.destination}...</p>
                  </div>
                </div>
              )}
              <GoogleMap
                center={mapCenter}
                zoom={isMapReady ? 13 : 12}
                onPlaceSelect={handleMapPlaceSelect}
                markers={getMapMarkers()}
                className={`w-full h-96 rounded-lg ${!isMapReady ? 'opacity-50' : ''}`}
              />
              
              {isMapReady && (
                <p className="text-xs text-gray-500 mt-2 text-left">
                  📍 Centered on: {tripData?.destination}
                </p>
              )}
            </div>
          </div>

          {/* Right Panel - Itinerary */}
          <div className="xl:col-span-1 lg:col-span-2 xl:lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center text-left">
                <CalendarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                Daily Itinerary
              </h2>
              <div className="space-y-4 max-h-80 lg:max-h-96 overflow-y-auto">
                {days.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No days generated for this trip</p>
                    <div className="text-xs text-gray-400">
                      <p>Trip dates: {trip.startDate || (trip as any).start_date} to {trip.endDate || (trip as any).end_date}</p>
                      <p>Duration: {(trip as any).duration} days</p>
                    </div>
                  </div>
                ) : (
                  days.map((day) => (
                    <ItineraryDay
                      key={day.dayNumber}
                      day={day}
                      items={itinerary.filter(item => item.day === day.dayNumber)}
                      onDrop={(place) => handleDropToDay(place, day.dayNumber)}
                      onRemoveItem={handleRemoveFromItinerary}
                      onUpdateItem={handleUpdateItineraryItem}
                      onMoveItem={handleMoveItineraryItem}
                      // onAddFlight removed - using top-level Add Flight button instead
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hotel Modal */}
      {showHotelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Hotel Stay</h3>
                <button
                  onClick={() => setShowHotelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <HotelFormComponent
                onSubmit={handleAddHotel}
                onCancel={() => setShowHotelModal(false)}
                tripStartDate={tripData?.startDate}
                tripEndDate={tripData?.endDate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Flight Modal */}
      {showFlightModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Flight</h3>
                <button
                  onClick={() => setShowFlightModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <FlightForm
                onSave={handleAddFlight}
                onCancel={() => setShowFlightModal(false)}
                tripStartDate={tripData?.startDate}
                tripEndDate={tripData?.endDate}
              />
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
};

export default TripPlanningPage;
