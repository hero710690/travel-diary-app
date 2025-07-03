import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  markers?: Array<{
    position: { lat: number; lng: number };
    title: string;
    address?: string;
    rating?: number;
    types?: string[];
    markerType?: 'activity' | 'hotel' | 'flight' | 'default';
  }>;
  className?: string;
}

const MapComponent: React.FC<MapProps> = ({ center, zoom, onPlaceSelect, markers = [], className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [service, setService] = useState<google.maps.places.PlacesService>();
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([]);

  // Function to find airport location by airport code
  const findAirportLocation = async (airportCode: string, placesService: google.maps.places.PlacesService): Promise<google.maps.LatLng | null> => {
    return new Promise((resolve) => {
      const request = {
        query: `${airportCode} airport`,
        fields: ['place_id', 'geometry', 'name']
      };

      placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          const location = results[0].geometry?.location;
          if (location) {
            resolve(location);
            return;
          }
        }
        
        // Fallback: try with just the airport code
        const fallbackRequest = {
          query: airportCode,
          fields: ['place_id', 'geometry', 'name']
        };
        
        placesService.textSearch(fallbackRequest, (fallbackResults, fallbackStatus) => {
          if (fallbackStatus === google.maps.places.PlacesServiceStatus.OK && fallbackResults && fallbackResults[0]) {
            const location = fallbackResults[0].geometry?.location;
            if (location) {
              resolve(location);
              return;
            }
          }
          resolve(null);
        });
      });
    });
  };
  const getMarkerIcon = (markerType?: 'activity' | 'hotel' | 'flight' | 'default') => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    
    switch (markerType) {
      case 'activity':
        return {
          url: `${baseUrl}blue-dot.png`,
          scaledSize: new google.maps.Size(32, 32),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(16, 32)
        };
      case 'hotel':
        return {
          url: `${baseUrl}purple-dot.png`,
          scaledSize: new google.maps.Size(32, 32),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(16, 32)
        };
      case 'flight':
        return {
          url: `${baseUrl}green-dot.png`,
          scaledSize: new google.maps.Size(32, 32),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(16, 32)
        };
      default:
        return {
          url: `${baseUrl}red-dot.png`,
          scaledSize: new google.maps.Size(32, 32),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(16, 32)
        };
    }
  };

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
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
            console.log('🗺️ Map clicked at:', event.latLng.toJSON());
            
            // Function to handle geocoding fallback
            const performGeocoding = () => {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode(
                { location: event.latLng },
                (results, geocodeStatus) => {
                  console.log('🔍 Geocoding status:', geocodeStatus);
                  
                  if (geocodeStatus === 'OK' && results && results[0]) {
                    // Try to find the most specific result (not just country/city)
                    const specificResult = results.find(result => 
                      result.types.some(type => 
                        ['street_address', 'premise', 'subpremise', 'establishment'].includes(type)
                      )
                    ) || results[0];
                    
                    console.log('📍 Using geocoded result:', {
                      formatted_address: specificResult.formatted_address,
                      types: specificResult.types,
                      place_id: specificResult.place_id
                    });
                    
                    const geocodedPlace: google.maps.places.PlaceResult = {
                      place_id: specificResult.place_id,
                      name: specificResult.formatted_address.split(',')[0], // Use first part as name
                      formatted_address: specificResult.formatted_address,
                      geometry: {
                        location: event.latLng!,
                      },
                      rating: undefined, // No rating available from geocoding
                      types: specificResult.types,
                    };
                    
                    // Add temporary marker for geocoded location
                    const tempMarker = new google.maps.Marker({
                      position: event.latLng,
                      map: map,
                      title: geocodedPlace.name || 'Selected Location',
                      icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6"/>
                            <circle cx="12" cy="9" r="2.5" fill="white"/>
                          </svg>
                        `),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 24)
                      }
                    });
                    
                    // Remove marker after 2 seconds
                    setTimeout(() => {
                      tempMarker.setMap(null);
                    }, 2000);
                    
                    console.log('📍 Passing geocoded place to onPlaceSelect');
                    onPlaceSelect(geocodedPlace);
                  } else {
                    console.log('❌ Geocoding failed');
                  }
                }
              );
            };
            
            // Try to get the place that was actually clicked on
            // Check if the click was on a place/POI directly
            const placeId = (event as any).placeId;
            if (placeId) {
              console.log('🎯 Direct place click detected, place_id:', placeId);
              
              // Get details for the exact place that was clicked
              const detailsRequest = {
                placeId: placeId,
                fields: [
                  'place_id', 
                  'name', 
                  'formatted_address', 
                  'geometry', 
                  'photos', 
                  'rating', 
                  'types',
                  'user_ratings_total',
                  'price_level',
                  'vicinity',
                  'opening_hours',
                  'website',
                  'business_status',
                  'address_components'
                ]
              };

              console.log('🔍 Getting details for clicked place:', placeId);

              placesService.getDetails(detailsRequest, (placeDetails, detailsStatus) => {
                console.log('🔍 Place details status:', detailsStatus);
                
                if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                  console.log('✅ Got details for clicked place:', {
                    name: placeDetails.name,
                    rating: placeDetails.rating,
                    types: placeDetails.types,
                    formatted_address: placeDetails.formatted_address
                  });
                  
                  // Add a temporary marker at the clicked location
                  const tempMarker = new google.maps.Marker({
                    position: event.latLng,
                    map: map,
                    title: placeDetails.name || 'Selected Place',
                    icon: {
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#10b981"/>
                          <circle cx="12" cy="9" r="2.5" fill="white"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(24, 24),
                      anchor: new google.maps.Point(12, 24)
                    }
                  });
                  
                  // Remove marker after 2 seconds
                  setTimeout(() => {
                    tempMarker.setMap(null);
                  }, 2000);
                  
                  console.log('🗺️ Passing clicked place details to onPlaceSelect');
                  onPlaceSelect(placeDetails);
                } else {
                  console.log('❌ Failed to get details for clicked place');
                  // Fall back to geocoding
                  performGeocoding();
                }
              });
            } else {
              console.log('🔍 No direct place click detected, using reverse geocoding for coordinates');
              performGeocoding();
            }
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
    }
  }, [map, center, zoom]);

  // Update markers when they change
  useEffect(() => {
    if (map) {
      // Clear existing markers
      mapMarkers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];
      
      // Create places service for airport lookups
      const placesService = new google.maps.places.PlacesService(map);
      
      // Process markers
      const processMarkers = async () => {
        for (const markerData of markers) {
          // Handle flight markers differently - find airport locations
          if (markerData.markerType === 'flight' && markerData.title.includes('→')) {
            // Extract airport codes from flight description
            const description = markerData.title;
            const airportMatch = description.match(/([A-Z]{3})\s*→\s*([A-Z]{3})/);
            
            if (airportMatch) {
              const [, departureCode, arrivalCode] = airportMatch;
              
              // Find both airport locations
              const departureLocation = await findAirportLocation(departureCode, placesService);
              const arrivalLocation = await findAirportLocation(arrivalCode, placesService);
              
              // Create markers for both airports if found
              if (departureLocation) {
                const departureMarker = new google.maps.Marker({
                  position: departureLocation,
                  map: map,
                  title: `${departureCode} - Departure`,
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(32, 32),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(16, 32)
                  }
                });
                newMarkers.push(departureMarker);
              }
              
              if (arrivalLocation) {
                const arrivalMarker = new google.maps.Marker({
                  position: arrivalLocation,
                  map: map,
                  title: `${arrivalCode} - Arrival`,
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                    scaledSize: new google.maps.Size(32, 32),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(16, 32)
                  }
                });
                newMarkers.push(arrivalMarker);
              }
            }
          } else {
            // Regular marker (activity, hotel, etc.)
            const marker = new google.maps.Marker({
              position: markerData.position,
              map: map,
              title: markerData.title,
              icon: getMarkerIcon(markerData.markerType)
            });
            
            newMarkers.push(marker);
          }
        }
        
        setMapMarkers(newMarkers);
      };
      
      processMarkers();
    }
  }, [map, markers]);

  return <div ref={ref} className={className} />;
};

const GoogleMap: React.FC<MapProps> = (props) => {
  const render = (status: Status) => {
    if (status === Status.LOADING) return <div>Loading...</div>;
    if (status === Status.FAILURE) return <div>Error loading map</div>;
    return <MapComponent {...props} />;
  };

  return (
    <Wrapper
      apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY!}
      render={render}
      libraries={['places']}
    />
  );
};

// Wrapper component for Google Maps API loading
interface WrapperProps {
  apiKey: string;
  render: (status: Status) => React.ReactElement;
  libraries: string[];
}

enum Status {
  LOADING,
  FAILURE,
  SUCCESS,
}

const Wrapper: React.FC<WrapperProps> = ({ apiKey, render, libraries }) => {
  const [status, setStatus] = useState<Status>(Status.LOADING);

  useEffect(() => {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: libraries as any,
    });

    loader
      .load()
      .then(() => setStatus(Status.SUCCESS))
      .catch(() => setStatus(Status.FAILURE));
  }, [apiKey, libraries]);

  return render(status);
};

export default GoogleMap;
