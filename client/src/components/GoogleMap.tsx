import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import GoogleMapFallback from './GoogleMapFallback';

interface MapProps {
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

const MapComponent: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  onPlaceSelect, 
  markers = [],
  className = "w-full h-96"
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [service, setService] = useState<google.maps.places.PlacesService>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });
      
      setMap(newMap);
      
      // Initialize Places Service
      const placesService = new google.maps.places.PlacesService(newMap);
      setService(placesService);

      // Add click listener for place selection
      if (onPlaceSelect) {
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            // Reverse geocoding to get place details
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode(
              { location: event.latLng },
              (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const place: google.maps.places.PlaceResult = {
                    place_id: results[0].place_id,
                    name: results[0].formatted_address,
                    formatted_address: results[0].formatted_address,
                    geometry: {
                      location: event.latLng!,
                    },
                  };
                  onPlaceSelect(place);
                }
              }
            );
          }
        });
      }
    }
  }, [ref, map, center, zoom, onPlaceSelect]);

  // Update map center when center prop changes
  useEffect(() => {
    if (map && center) {
      console.log('🗺️ Updating map center to:', center);
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  // Update markers when they change
  useEffect(() => {
    if (map) {
      // Clear existing markers (you might want to store them in state to manage them better)
      markers.forEach((markerData) => {
        new google.maps.Marker({
          position: markerData.position,
          map: map,
          title: markerData.title,
        });
      });
    }
  }, [map, markers]);

  return <div ref={ref} className={className} />;
};

const GoogleMap: React.FC<MapProps> = (props) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  // If no API key, show fallback
  if (!apiKey) {
    return <GoogleMapFallback {...props} />;
  }

  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return (
          <div className="flex items-center justify-center h-96 bg-gray-100">
            <div className="text-gray-500">Loading map...</div>
          </div>
        );
      case Status.FAILURE:
        return <GoogleMapFallback {...props} />;
      case Status.SUCCESS:
        return <MapComponent {...props} />;
    }
  };

  return (
    <Wrapper 
      apiKey={apiKey} 
      render={render}
      libraries={['places', 'geometry']}
    />
  );
};

export default GoogleMap;
