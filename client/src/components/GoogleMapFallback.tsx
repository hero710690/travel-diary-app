import React from 'react';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MapFallbackProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  markers?: Array<{
    position: google.maps.LatLngLiteral;
    title: string;
    id: string;
  }>;
  className?: string;
}

const GoogleMapFallback: React.FC<MapFallbackProps> = ({ 
  center, 
  markers = [],
  className = "w-full h-96"
}) => {
  return (
    <div className={`${className} bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-8`}>
      <div className="text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Google Maps Not Available</h3>
        <p className="text-sm text-gray-600 mb-4">
          The Google Maps API key is invalid or not configured properly.
        </p>
        
        {/* Show location info */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <div className="flex items-center justify-center mb-2">
            <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Map Center</span>
          </div>
          <p className="text-xs text-gray-500">
            Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}
          </p>
        </div>

        {/* Show markers if any */}
        {markers.length > 0 && (
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Planned Locations ({markers.length})
            </h4>
            <div className="space-y-1">
              {markers.map((marker, index) => (
                <div key={marker.id} className="text-xs text-gray-600 flex items-center">
                  <MapPinIcon className="h-3 w-3 text-gray-400 mr-1" />
                  {marker.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <p>To fix this issue:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1 text-left">
            <li>Get a valid Google Maps API key</li>
            <li>Enable Maps JavaScript API and Places API</li>
            <li>Update REACT_APP_GOOGLE_MAPS_API_KEY in .env</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapFallback;
