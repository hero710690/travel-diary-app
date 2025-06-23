import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, addDays, differenceInDays } from 'date-fns';
import { tripsAPI } from '../services/api';
import { Trip, ItineraryItem, FlightInfo } from '../types';
import { safeParseDate, addDaysToDate, getDaysDifferenceIgnoreTime } from '../utils/dateUtils';
import GoogleMap from '../components/GoogleMap';
import PlacesSearch from '../components/PlacesSearch';
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
}

const TripPlanningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lng: 2.3522 }); // Default to Paris
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Fetch trip data
  const { data: tripData, isLoading } = useQuery(
    ['trip', id],
    () => tripsAPI.getTripById(id!),
    {
      enabled: !!id,
      onSuccess: (response) => {
        const trip = response.data.trip;
        
        // Transform backend itinerary to frontend format
        if (trip.itinerary && trip.itinerary.length > 0) {
          const transformedItinerary = trip.itinerary.map((item: any, index: number) => {
            // Calculate day number from date using safe date parsing
            const tripStartDate = safeParseDate(trip.startDate);
            const itemDate = safeParseDate(item.date);
            
            // Use the new utility function to avoid timezone issues
            const dayDifference = getDaysDifferenceIgnoreTime(tripStartDate, itemDate);
            const dayNumber = dayDifference + 1;
            
            console.log('📅 Day calculation debug:', {
              tripStartDate: tripStartDate.toISOString(),
              itemDate: itemDate.toISOString(),
              dayDifference,
              calculatedDay: dayNumber,
              itemId: item._id
            });

            // Check if this is a flight item
            const isFlightItem = item.flightInfo || (item.place?.types && item.place.types.includes('flight'));

            return {
              id: item._id || `item_${index}`,
              day: Math.max(1, dayNumber),
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
              // Include flight info if available
              flightInfo: item.flightInfo || undefined,
            };
          });
          
          console.log('📥 Loaded and transformed itinerary:', transformedItinerary);
          setItinerary(transformedItinerary);
        } else {
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
    (transformedItinerary: any[]) => tripsAPI.updateItinerary(id!, transformedItinerary),
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
    setSelectedPlaces(prev => {
      const exists = prev.find(p => p.place_id === place.place_id);
      if (!exists) {
        return [...prev, place];
      }
      return prev;
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
    const newPlace: Place = {
      place_id: place.place_id || `custom_${Date.now()}`,
      name: place.name || 'Selected Location',
      formatted_address: place.formatted_address || '',
      geometry: place.geometry,
    };
    handlePlaceSelect(newPlace);
  };

  const generateDays = () => {
    if (!tripData?.data.trip) return [];
    
    const trip = tripData.data.trip;
    
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
    };

    setItinerary(prev => [...prev, newItineraryItem]);
  };

  const handleRemoveFromItinerary = (itemId: string) => {
    setItinerary(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateItineraryItem = (itemId: string, updates: Partial<ItineraryItem>) => {
    setItinerary(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const handleMoveItineraryItem = (itemId: string, newDay: number) => {
    setItinerary(prev => prev.map(item => 
      item.id === itemId ? { ...item, day: newDay } : item
    ));
  };

  const handleAddFlight = (dayNumber: number, flightInfo: FlightInfo, time: string) => {
    const newFlightItem: ItineraryItem = {
      id: `flight_${dayNumber}_${Date.now()}`,
      day: dayNumber,
      time: time,
      title: `${flightInfo.airline} ${flightInfo.flightNumber}`,
      description: `${flightInfo.departure.airportCode} → ${flightInfo.arrival.airportCode}`,
      location: {
        name: `${flightInfo.departure.airport} to ${flightInfo.arrival.airport}`,
        address: `${flightInfo.departure.airportCode} → ${flightInfo.arrival.airportCode}`,
        coordinates: undefined, // Flights don't have single coordinates
      },
      duration: flightInfo.duration ? parseInt(flightInfo.duration.replace(/[^\d]/g, '')) * 60 : 120, // Convert to minutes
      type: 'flight',
      flightInfo: flightInfo,
      notes: flightInfo.bookingReference ? `Booking: ${flightInfo.bookingReference}` : '',
    };

    setItinerary(prev => [...prev, newFlightItem]);
    toast.success('Flight added to itinerary!');
  };

  const handleSaveItinerary = () => {
    if (!tripData?.data.trip) {
      toast.error('Trip data not available');
      return;
    }

    // Transform the itinerary to match backend schema
    const transformedItinerary = itinerary.map((item, index) => {
      // Calculate the actual date based on trip start date and day number
      const tripStartDateValue = tripData?.data.trip.startDate;
      console.log('🔍 Trip start date value:', tripStartDateValue);
      
      const tripStartDate = safeParseDate(tripStartDateValue);
      console.log('🔍 Parsed trip start date:', tripStartDate, 'isValid:', !isNaN(tripStartDate.getTime()));
      
      const itemDate = addDaysToDate(tripStartDate, item.day - 1);
      console.log('🔍 Save calculation debug:', {
        itemId: item.id,
        itemDay: item.day,
        tripStartDate: tripStartDate.toISOString(),
        calculatedDate: itemDate.toISOString(),
        dayOffset: item.day - 1
      });

      // Handle flight items differently
      if (item.type === 'flight' && item.flightInfo) {
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
          date: itemDate.toISOString(),
          start_time: item.time,
          end_time: item.time,
          estimated_duration: item.duration || 120,
          notes: item.notes || '',
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
        date: itemDate.toISOString(),
        start_time: item.time,
        end_time: item.time, // Could calculate based on duration
        estimated_duration: item.duration || 60,
        notes: item.notes || '',
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
      }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!tripData?.data.trip) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Trip not found</p>
      </div>
    );
  }

  const trip = tripData.data.trip;
  const days = generateDays();

  // Debug logging
  console.log('Trip data:', trip);
  console.log('Generated days:', days);
  console.log('Days count:', days.length);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/trips/${id}`)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Trip
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Plan Your Trip</h1>
              <p className="text-gray-600">{trip.title} - {trip.destination}</p>
            </div>
            <button
              onClick={handleSaveItinerary}
              disabled={updateItineraryMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updateItineraryMutation.isLoading ? 'Saving...' : 'Save Itinerary'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left Panel - Search and Places */}
          <div className="xl:col-span-1 space-y-4 lg:space-y-6">
            {/* Places Search */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Search Places</h2>
              <PlacesSearch
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search restaurants, attractions, hotels..."
              />
            </div>

            {/* Selected Places */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
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
                  <p className="text-gray-500 text-sm">
                    Search and select places to add to your itinerary
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Panel - Map */}
          <div className="xl:col-span-1 lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="truncate">Map View</span>
                {tripData?.data.trip && (
                  <span className="ml-2 text-sm text-gray-500 truncate">
                    - {tripData.data.trip.destination}
                  </span>
                )}
              </h2>
              {!isMapReady && (
                <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading map for {tripData?.data.trip?.destination}...</p>
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
                <p className="text-xs text-gray-500 mt-2 text-center">
                  📍 Centered on: {tripData?.data.trip?.destination}
                </p>
              )}
            </div>
          </div>

          {/* Right Panel - Itinerary */}
          <div className="xl:col-span-1 lg:col-span-2 xl:lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
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
                      onAddFlight={handleAddFlight}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default TripPlanningPage;
