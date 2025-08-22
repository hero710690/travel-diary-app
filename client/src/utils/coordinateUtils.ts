/**
 * Utility functions for safely extracting coordinates from Google Maps objects
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Safely extracts coordinates from a Google Maps geometry.location object
 * Handles both function-based (google.maps.LatLng) and property-based formats
 */
export const safeExtractCoordinates = (location: any): Coordinates | undefined => {
  if (!location) {
    return undefined;
  }

  try {
    let lat: number;
    let lng: number;

    // Handle function-based format (google.maps.LatLng)
    if (typeof location.lat === 'function' && typeof location.lng === 'function') {
      lat = location.lat();
      lng = location.lng();
    }
    // Handle property-based format
    else if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      lat = location.lat;
      lng = location.lng;
    }
    // Handle nested property format
    else if (location.lat && location.lng) {
      lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      lng = typeof location.lng === 'function' ? location.lng() : location.lng;
    }
    else {
      console.warn('⚠️ Unable to extract coordinates from location object:', location);
      return undefined;
    }

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('⚠️ Invalid coordinates extracted:', { lat, lng });
      return undefined;
    }

    // Basic bounds checking
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('⚠️ Coordinates out of valid range:', { lat, lng });
      return undefined;
    }

    return { lat, lng };
  } catch (error) {
    console.error('❌ Error extracting coordinates:', error);
    return undefined;
  }
};

/**
 * Safely extracts coordinates from a place's geometry object
 */
export const safeExtractPlaceCoordinates = (place: any): Coordinates | undefined => {
  if (!place?.geometry?.location) {
    return undefined;
  }

  return safeExtractCoordinates(place.geometry.location);
};
