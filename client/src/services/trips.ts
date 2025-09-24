import { api } from './api';
import { API_CONFIG } from '../config/api';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  status: string;
  budget?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTripRequest {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface UpdateTripRequest {
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  dayNotes?: Array<{day: number; date: string; notes: string}>;
}

// Frontend display interface (for UI components)
export interface TripDisplay {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  status: string;
  budget?: number;
  totalBudget?: number;
  currency?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  itinerary?: any[]; // Temporary compatibility
}

const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_V1}${endpoint}`;
};

// Transform backend trip to frontend display format
const transformTripForDisplay = (trip: Trip): TripDisplay => {
  console.log('🔄 transformTripForDisplay - Input trip:', trip);
  
  const result = {
    id: trip.id,
    name: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    description: trip.description,
    status: trip.status,
    budget: trip.budget,
    totalBudget: trip.budget,
    currency: 'USD', // Default currency since backend doesn't provide it
    userId: trip.user_id,
    createdAt: trip.created_at,
    updatedAt: trip.updated_at,
    itinerary: (trip as any).itinerary || [], // Include itinerary data from backend
    dayNotes: (trip as any).dayNotes || [], // Include dayNotes data from backend
  };
  
  console.log('🔄 transformTripForDisplay - Output result:', result);
  return result;
};

// Transform frontend form data to backend format
const transformTripForBackend = (data: {
  name?: string;
  title?: string;
  destination?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  description?: string;
  dayNotes?: Array<{day: number; date: string; notes: string}>;
}): CreateTripRequest | UpdateTripRequest => {
  const result: any = {};
  
  if (data.title || data.name) {
    result.title = data.title || data.name;
  }
  
  if (data.destination) {
    result.destination = data.destination;
  }
  
  if (data.start_date || data.startDate) {
    result.start_date = data.start_date || data.startDate;
  }
  
  if (data.end_date || data.endDate) {
    result.end_date = data.end_date || data.endDate;
  }
  
  if (data.description !== undefined) {
    result.description = data.description;
  }
  
  if (data.dayNotes !== undefined) {
    result.dayNotes = data.dayNotes;
  }
  
  return result;
};

export const tripsService = {
  // Get all trips for current user
  getTrips: async (): Promise<TripDisplay[]> => {
    console.log('🚀 tripsService.getTrips called');
    const response = await api.get<Trip[]>(getApiUrl('/trips'));
    // Backend returns array directly
    const trips = Array.isArray(response.data) ? response.data : [];
    console.log('✅ tripsService.getTrips response:', trips);
    return trips.map(transformTripForDisplay);
  },

  // Get single trip by ID
  getTrip: async (id: string): Promise<TripDisplay> => {
    console.log('🚀 tripsService.getTrip called with id:', id);
    const response = await api.get<Trip>(getApiUrl(`/trips/${id}`));
    // Backend returns trip object directly
    console.log('✅ tripsService.getTrip response:', response.data);
    console.log('🔍 Trip dayNotes field:', (response.data as any).dayNotes);
    return transformTripForDisplay(response.data);
  },

  // Create new trip
  createTrip: async (data: {
    name?: string;
    title?: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
  }): Promise<TripDisplay> => {
    console.log('🚀 tripsService.createTrip called with data:', data);
    const backendData = transformTripForBackend(data) as CreateTripRequest;
    console.log('🔄 Transformed backend data:', backendData);
    
    const response = await api.post<{message: string; trip: Trip}>(getApiUrl('/trips'), backendData);
    console.log('✅ tripsService.createTrip response:', response.data);
    
    // Backend returns {message: "...", trip: {...}}
    return transformTripForDisplay(response.data.trip);
  },

  // Update existing trip
  updateTrip: async (id: string, data: {
    name?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    dayNotes?: Array<{day: number; date: string; notes: string}>;
  }): Promise<TripDisplay> => {
    console.log('🚀 tripsService.updateTrip called with id:', id, 'data:', data);
    const backendData = transformTripForBackend(data) as UpdateTripRequest;
    const response = await api.put<{message: string; trip: Trip}>(getApiUrl(`/trips/${id}`), backendData);
    console.log('✅ tripsService.updateTrip response:', response.data);
    
    // Backend likely returns {message: "...", trip: {...}}
    return transformTripForDisplay(response.data.trip);
  },

  // Delete trip
  deleteTrip: async (id: string): Promise<void> => {
    console.log('🚀 tripsService.deleteTrip called with id:', id);
    
    // Debug token
    const token = localStorage.getItem('authToken');
    console.log('🔑 Auth token exists:', !!token);
    console.log('🔑 Auth token length:', token?.length || 0);
    console.log('🔑 Auth token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    
    try {
      await api.delete(getApiUrl(`/trips/${id}`));
      console.log('✅ tripsService.deleteTrip completed successfully');
    } catch (error: any) {
      console.error('❌ tripsService.deleteTrip error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  },

  // Update trip itinerary (temporary compatibility method)
  updateItinerary: async (id: string, itinerary: any[]): Promise<void> => {
    console.log('🚀 tripsService.updateItinerary called with id:', id, 'itinerary:', itinerary);
    await api.put(getApiUrl(`/trips/${id}/itinerary`), { itinerary });
    console.log('✅ tripsService.updateItinerary completed');
  },

  // Get shared trip (temporary compatibility method)
  getSharedTrip: async (token: string): Promise<TripDisplay> => {
    console.log('🚀 tripsService.getSharedTrip called with token:', token);
    const response = await api.get<Trip>(getApiUrl(`/shared/${token}`));
    console.log('✅ tripsService.getSharedTrip response:', response.data);
    return transformTripForDisplay(response.data);
  },
};
