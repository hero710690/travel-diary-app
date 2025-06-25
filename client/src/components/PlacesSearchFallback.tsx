import React, { useState } from 'react';
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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

interface PlacesSearchFallbackProps {
  onPlaceSelect: (place: Place) => void;
  placeholder?: string;
  className?: string;
}

const PlacesSearchFallback: React.FC<PlacesSearchFallbackProps> = ({
  onPlaceSelect,
  placeholder = "Search for places...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualPlace, setManualPlace] = useState({
    name: '',
    address: ''
  });

  const handleManualAdd = () => {
    if (manualPlace.name.trim()) {
      const place: Place = {
        place_id: `manual_${Date.now()}`,
        name: manualPlace.name,
        formatted_address: manualPlace.address || manualPlace.name,
      };
      onPlaceSelect(place);
      setManualPlace({ name: '', address: '' });
      setShowManualAdd(false);
      setQuery('');
    }
  };

  return (
    <div className={className}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          disabled
        />
      </div>

      {/* Warning Message */}
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Places Search Not Available
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Google Places API is not configured. You can still add places manually.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Add Button */}
      <div className="mt-3">
        <button
          onClick={() => setShowManualAdd(!showManualAdd)}
          className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {showManualAdd ? 'Cancel' : 'Add Place Manually'}
        </button>
      </div>

      {/* Manual Add Form */}
      {showManualAdd && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place Name *
              </label>
              <input
                type="text"
                value={manualPlace.name}
                onChange={(e) => setManualPlace(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Tokyo Tower"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Optional)
              </label>
              <input
                type="text"
                value={manualPlace.address}
                onChange={(e) => setManualPlace(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 4 Chome-2-8 Shibakoen, Minato City, Tokyo"
              />
            </div>
            <button
              onClick={handleManualAdd}
              disabled={!manualPlace.name.trim()}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Place
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesSearchFallback;
