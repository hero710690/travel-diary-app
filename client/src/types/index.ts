export interface User {
  _id?: string; // MongoDB style ID (optional for backward compatibility)
  user_id?: string; // API Gateway style ID
  id?: string; // Generic ID (optional)
  email: string;
  name: string;
  avatar?: string;
  preferredCurrency?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Place {
  name: string;
  address?: string;
  placeId?: string;
  place_id?: string; // Google Maps place ID
  formatted_address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  geometry?: {
    location: google.maps.LatLng;
  };
  rating?: number;
  user_ratings_total?: number; // Google reviews count
  userInterestRating?: number; // User's interest level (1-5 stars)
  photos?: string[] | google.maps.places.PlacePhoto[]; // Support both formats
  phone?: string;
  website?: string;
  priceLevel?: number;
  types?: string[]; // Google place types
  vicinity?: string;
  address_components?: google.maps.GeocoderAddressComponent[];
  plus_code?: google.maps.places.PlacePlusCode;
  business_status?: string;
  editorial_summary?: string;
}

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    airportCode: string;
    date: string; // YYYY-MM-DD format
    time: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    airportCode: string;
    date: string; // YYYY-MM-DD format
    time: string;
    terminal?: string;
    gate?: string;
  };
  duration?: string; // e.g., "2h 30m"
  aircraft?: string;
  seatNumber?: string;
  bookingReference?: string;
  status?: 'scheduled' | 'delayed' | 'cancelled' | 'boarding' | 'departed' | 'arrived';
}

export interface BusInfo {
  company: string;
  busNumber: string;
  departure: {
    station: string;
    city: string;
    date: string; // YYYY-MM-DD format
    time: string;
    platform?: string;
  };
  arrival: {
    station: string;
    city: string;
    date: string; // YYYY-MM-DD format
    time: string;
    platform?: string;
  };
  duration?: string; // e.g., "2h 30m"
  busType?: string; // e.g., "Express", "Local", "Luxury"
  seatNumber?: string;
  bookingReference?: string;
  status?: 'scheduled' | 'delayed' | 'cancelled' | 'boarding' | 'departed' | 'arrived';
}

export interface HotelInfo {
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomType?: string;
  confirmationNumber?: string;
  phone?: string;
  rating?: number;
  pricePerNight?: number;
  totalPrice?: number;
  notes?: string; // Add notes field
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ItineraryItem {
  id: string;
  _id?: string;
  day: number;
  time: string;
  title: string;
  description?: string;
  location?: {
    name: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  duration?: number; // in minutes
  type: 'activity' | 'meal' | 'transport' | 'accommodation' | 'flight' | 'bus';
  notes?: string;
  userRating?: number; // User's experience rating (1-5 stars) - added after visiting
  // Flight-specific information
  flightInfo?: FlightInfo;
  // Bus-specific information
  busInfo?: BusInfo;
  // Hotel-specific information
  hotelInfo?: HotelInfo;
  // Legacy fields for backward compatibility
  place?: Place;
  date?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  order?: number;
  isCustom?: boolean;
  customTitle?: string;
  customDescription?: string;
}

export interface BudgetCategory {
  _id?: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  color: string;
}

export interface PackingItem {
  _id?: string;
  name: string;
  category: string;
  isPacked: boolean;
  isEssential: boolean;
}

export interface Document {
  _id?: string;
  name: string;
  type: 'passport' | 'visa' | 'ticket' | 'booking' | 'other';
  fileUrl?: string;
  expiryDate?: string;
  notes?: string;
  uploadedAt: string;
}

export interface Collaborator {
  user: User;
  role: 'editor' | 'viewer';
  invitedAt: string;
  acceptedAt?: string;
}

export interface ActivityPhoto {
  id: string;
  url: string;
  activity_index?: number;
  day?: number;
  activity_title?: string;
  filename?: string;
  uploaded_at?: string;
}

export interface Trip {
  _id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'ongoing' | 'completed';
  owner: User;
  collaborators: Collaborator[];
  wishlist: Place[];
  itinerary: ItineraryItem[];
  totalBudget: number;
  currency: string;
  budgetCategories: BudgetCategory[];
  packingList: PackingItem[];
  documents: Document[];
  isPublic: boolean;
  shareToken?: string;
  dayNotes?: Array<{day: number; notes: string}>;
  coverImage?: string;
  tags: string[];
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  trip: string;
  user: User;
  amount: number;
  currency: string;
  convertedAmount?: number;
  exchangeRate?: number;
  category: 'food' | 'transport' | 'accommodation' | 'entertainment' | 'shopping' | 'other';
  title: string;
  description?: string;
  location?: string;
  date: string;
  receiptImage?: string;
  tags: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  url: string;
  caption?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  takenAt?: string;
  uploadedAt: string;
}

export interface JournalEntry {
  _id: string;
  trip: string;
  user: User;
  date: string;
  title?: string;
  content: string;
  photos: Photo[];
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  weather?: {
    temperature: number;
    condition: string;
    icon: string;
  };
  mood?: 'amazing' | 'great' | 'good' | 'okay' | 'disappointing';
  rating?: number;
  tags: string[];
  highlights: string[];
  isPrivate: boolean;
  isAutoGenerated: boolean;
  generatedFrom?: {
    itinerary: boolean;
    expenses: boolean;
    photos: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseStats {
  dailySpending: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  categoryBreakdown: Array<{
    _id: string;
    total: number;
    count: number;
    avgAmount: number;
  }>;
  totalStats: {
    totalSpent: number;
    totalExpenses: number;
    avgExpense: number;
    maxExpense: number;
    minExpense: number;
  };
  budget: {
    total: number;
    remaining: number;
    categories: BudgetCategory[];
  };
  currency: string;
}

export interface Travelogue {
  trip: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    duration: number;
    coverImage?: string;
  };
  summary: {
    totalDays: number;
    totalExpenses: number;
    currency: string;
    expenseBreakdown: Array<{
      _id: string;
      total: number;
      count: number;
    }>;
  };
  dailyEntries: Array<{
    date: string;
    title?: string;
    content: string;
    photos: Photo[];
    location?: string;
    mood?: string;
    rating?: number;
    highlights: string[];
    author: User;
  }>;
  itinerary: ItineraryItem[];
  generatedAt: string;
  generatedBy: User;
}

// API Response types
export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data?: T[];
  trips?: T[]; // For backward compatibility
  totalPages: number;
  currentPage: number;
  total: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TripForm {
  title: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget?: number;
  currency: string;
  isPublic?: boolean;
  tags?: string;
}

export interface ExpenseForm {
  amount: number;
  currency: string;
  category: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
}

export interface JournalForm {
  date: string;
  title?: string;
  content: string;
  location?: string;
  mood?: string;
  rating?: number;
  tags: string[];
  highlights: string[];
  isPrivate: boolean;
}
