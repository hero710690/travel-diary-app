import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';
import PlacesSearchFallback from './PlacesSearchFallback';

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

interface PlacesSearchProps {
  onPlaceSelect: (place: Place) => void;
  placeholder?: string;
  className?: string;
}

const PlacesSearch: React.FC<PlacesSearchProps> = ({
  onPlaceSelect,
  placeholder = "Search for places...",
  className = ""
}) => {
  // Check if API key is missing
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const shouldUseFallback = !apiKey;

  // Return fallback if API key is missing
  if (shouldUseFallback) {
    return <PlacesSearchFallback onPlaceSelect={onPlaceSelect} placeholder={placeholder} className={className} />;
  }

  return <PlacesSearchComponent onPlaceSelect={onPlaceSelect} placeholder={placeholder} className={className} />;
};

const PlacesSearchComponent: React.FC<PlacesSearchProps> = ({
  onPlaceSelect,
  placeholder = "Search for places...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService>();
  const placesServiceRef = useRef<google.maps.places.PlacesService>();

  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          serviceRef.current = new google.maps.places.AutocompleteService();
          
          // Create a dummy div for PlacesService
          const div = document.createElement('div');
          placesServiceRef.current = new google.maps.places.PlacesService(div);
          
          setIsGoogleMapsReady(true);
          console.log('✅ Google Places API initialized successfully');
        } catch (error) {
          console.error('❌ Error initializing Google Places API:', error);
          setIsGoogleMapsReady(false);
        }
      } else {
        console.log('⏳ Waiting for Google Maps to load...');
        // Retry after a short delay
        setTimeout(checkGoogleMaps, 1000);
      }
    };

    checkGoogleMaps();
  }, []);

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim() || !serviceRef.current || !isGoogleMapsReady) {
      console.log('❌ Cannot search: missing query, service, or Google Maps not ready');
      return;
    }

    setIsLoading(true);
    console.log('🔍 Searching for:', searchQuery);
    
    const request = {
      input: searchQuery,
      types: ['establishment', 'geocode'],
    };

    try {
      serviceRef.current.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);
        console.log('📍 Places API response:', status, predictions);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const places: Place[] = predictions.map(prediction => ({
            place_id: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            formatted_address: prediction.description,
          }));
          
          console.log('✅ Found places:', places);
          setSuggestions(places);
          setShowSuggestions(true);
        } else {
          console.log('❌ Places search failed:', status);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('❌ Error in places search:', error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const getPlaceDetails = (placeId: string) => {
    if (!placesServiceRef.current || !isGoogleMapsReady) {
      console.log('❌ Cannot get place details: service not ready');
      return;
    }

    console.log('📍 Getting details for place:', placeId);

    const request = {
      placeId: placeId,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'photos', 'rating', 'types']
    };

    try {
      placesServiceRef.current.getDetails(request, (place, status) => {
        console.log('📍 Place details response:', status, place);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onPlaceSelect(place as Place);
        } else {
          console.log('❌ Failed to get place details:', status);
        }
      });
    } catch (error) {
      console.error('❌ Error getting place details:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      searchPlaces(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (place: Place) => {
    setQuery(place.name);
    setShowSuggestions(false);
    getPlaceDetails(place.place_id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={isGoogleMapsReady ? placeholder : "Loading Google Maps..."}
          disabled={!isGoogleMapsReady}
          className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
            !isGoogleMapsReady ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        {!isGoogleMapsReady && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-xs text-orange-500">Loading...</div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {suggestions.map((place) => (
            <div
              key={place.place_id}
              onClick={() => handleSuggestionClick(place)}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-gray-900 break-words line-clamp-1 text-left">{place.name}</div>
                  <div className="text-sm text-gray-500 break-words line-clamp-2 text-left">{place.formatted_address}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isGoogleMapsReady && (
        <div className="mt-2 text-xs text-orange-600">
          ⏳ Waiting for Google Maps API to load. Check your API key configuration.
        </div>
      )}
    </div>
  );
};

export default PlacesSearch;
