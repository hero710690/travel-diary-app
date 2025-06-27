import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import PlacesSearchFallback from './PlacesSearchFallback';

interface Hotel {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: google.maps.LatLng;
  };
  photos?: google.maps.places.PlacePhoto[];
  rating?: number;
  types?: string[];
  price_level?: number;
}

interface HotelSearchProps {
  onHotelSelect: (hotel: Hotel) => void;
  placeholder?: string;
  className?: string;
}

const HotelSearch: React.FC<HotelSearchProps> = ({
  onHotelSelect,
  placeholder = "Search for hotels...",
  className = ""
}) => {
  // Check if API key is missing
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const shouldUseFallback = !apiKey;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Hotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Maps services
  useEffect(() => {
    if (shouldUseFallback) return;

    const initializeServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('🗺️ Google Maps API loaded, initializing hotel search services...');
        serviceRef.current = new google.maps.places.AutocompleteService();
        
        // Create a dummy div for PlacesService (required by Google Maps API)
        const dummyDiv = document.createElement('div');
        const map = new google.maps.Map(dummyDiv);
        placesServiceRef.current = new google.maps.places.PlacesService(map);
        
        setIsGoogleMapsReady(true);
        console.log('✅ Hotel search services initialized');
      } else {
        console.log('⏳ Google Maps API not ready, retrying...');
        setTimeout(initializeServices, 1000);
      }
    };

    initializeServices();
  }, [shouldUseFallback]);

  const searchHotels = async (searchQuery: string) => {
    if (!searchQuery.trim() || !serviceRef.current || !isGoogleMapsReady) {
      console.log('❌ Cannot search hotels: missing query, service, or Google Maps not ready');
      return;
    }

    setIsLoading(true);
    console.log('🏨 Searching for hotels:', searchQuery);
    
    // Use hotel-specific search with lodging type
    const request = {
      input: searchQuery,
      types: ['lodging'], // Focus on hotels and accommodations
    };

    try {
      serviceRef.current.getPlacePredictions(request, (predictions, status) => {
        console.log('🏨 Hotel search response:', status, predictions);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Get detailed information for each hotel
          const hotelPromises = predictions.slice(0, 5).map(prediction => 
            getHotelDetails(prediction.place_id)
          );
          
          Promise.all(hotelPromises).then(hotels => {
            const validHotels = hotels.filter(hotel => hotel !== null) as Hotel[];
            console.log('✅ Found hotels with details:', validHotels);
            setSuggestions(validHotels);
            setShowSuggestions(true);
            setIsLoading(false);
          });
        } else {
          console.log('❌ Hotel search failed:', status);
          setSuggestions([]);
          setShowSuggestions(false);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('❌ Error in hotel search:', error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const getHotelDetails = (placeId: string): Promise<Hotel | null> => {
    return new Promise((resolve) => {
      if (!placesServiceRef.current) {
        resolve(null);
        return;
      }

      const request = {
        placeId: placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'types', 'price_level']
      };

      placesServiceRef.current.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const hotel: Hotel = {
            place_id: place.place_id!,
            name: place.name!,
            formatted_address: place.formatted_address!,
            geometry: place.geometry?.location ? {
              location: place.geometry.location
            } : undefined,
            rating: place.rating,
            photos: place.photos,
            types: place.types,
            price_level: place.price_level
          };
          resolve(hotel);
        } else {
          resolve(null);
        }
      });
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      searchHotels(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleHotelSelect = (hotel: Hotel) => {
    setQuery(hotel.name);
    setShowSuggestions(false);
    onHotelSelect(hotel);
    console.log('🏨 Selected hotel:', hotel);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  if (shouldUseFallback) {
    return (
      <PlacesSearchFallback
        onPlaceSelect={(place) => onHotelSelect(place as Hotel)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {suggestions.map((hotel) => (
            <div
              key={hotel.place_id}
              onClick={() => handleHotelSelect(hotel)}
              className="cursor-pointer select-none relative py-3 px-4 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start">
                <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate text-left">
                      {hotel.name}
                    </p>
                    {hotel.rating && (
                      <div className="flex items-center ml-2">
                        <span className="text-xs text-yellow-600 font-medium">
                          ⭐ {hotel.rating}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1 text-left">
                    {hotel.formatted_address}
                  </p>
                  {hotel.price_level && (
                    <div className="mt-1">
                      <span className="text-xs text-green-600 text-left">
                        {'$'.repeat(hotel.price_level)} Price Level
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isLoading && query.length > 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-3 px-4 text-sm text-gray-500">
          No hotels found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default HotelSearch;
