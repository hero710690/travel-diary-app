import axios, { AxiosResponse } from 'axios';
import { 
  User, Trip, Expense, JournalEntry, ExpenseStats, Travelogue,
  LoginForm, RegisterForm, TripForm, ExpenseForm, JournalForm,
  PaginatedResponse
} from '../types';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with better CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false for CloudFront
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect on 401, let components handle it
    if (error.response?.status === 401) {
      console.log('API: 401 error received');
      // Only clear storage, don't redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginForm): Promise<AxiosResponse<{ token: string; user: User; message: string }>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterForm): Promise<AxiosResponse<{ token: string; user: User; message: string }>> =>
    api.post('/auth/register', data),
  
  getMe: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),
  
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<{ user: User; message: string }>> =>
    api.put('/users/me', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/auth/change-password', data),
};

// Trips API
export const tripsAPI = {
  getTrips: (params?: { status?: string; page?: number; limit?: number }): Promise<AxiosResponse<Trip[]>> =>
    api.get('/trips/', { params }), // Add trailing slash
  
  getTrip: (id: string): Promise<AxiosResponse<{ trip: Trip; message: string }>> =>
    api.get(`/trips/${id}`),
  
  getTripById: (id: string): Promise<AxiosResponse<{ trip: Trip; message: string }>> =>
    api.get(`/trips/${id}`),
  
  createTrip: (data: TripForm): Promise<AxiosResponse<{ trip: Trip; message: string }>> =>
    api.post('/trips/', data), // Add trailing slash
  
  updateTrip: (id: string, data: Partial<Trip>): Promise<AxiosResponse<{ trip: Trip; message: string }>> =>
    api.put(`/trips/${id}`, data),
  
  deleteTrip: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/trips/${id}`),
  
  addToWishlist: (id: string, place: any): Promise<AxiosResponse<{ wishlist: any[]; message: string }>> =>
    api.post(`/trips/${id}/wishlist`, { place }),
  
  updateItinerary: (id: string, itinerary: any[]): Promise<AxiosResponse<{ itinerary: any[]; message: string }>> =>
    api.put(`/trips/${id}/itinerary`, { itinerary }),
  
  updatePackingList: (id: string, packingList: any[]): Promise<AxiosResponse<{ packingList: any[]; message: string }>> =>
    api.put(`/trips/${id}/packing`, { packingList }),
  
  generateShareLink: (id: string): Promise<AxiosResponse<{ shareUrl: string }>> =>
    api.post(`/trips/${id}/share`),
  
  getSharedTrip: (token: string): Promise<AxiosResponse<{ trip: Trip }>> =>
    api.get(`/trips/shared/${token}`),
};

// Expenses API
export const expensesAPI = {
  getExpenses: (tripId: string, params?: { category?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<AxiosResponse<PaginatedResponse<Expense> & { categoryTotals: any[]; totalSpent: number; currency: string }>> =>
    api.get(`/expenses/trip/${tripId}`, { params }),
  
  createExpense: (data: ExpenseForm & { trip: string }): Promise<AxiosResponse<{ expense: Expense }>> =>
    api.post('/expenses', data),
  
  updateExpense: (id: string, data: Partial<ExpenseForm>): Promise<AxiosResponse<{ expense: Expense }>> =>
    api.put(`/expenses/${id}`, data),
  
  deleteExpense: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/expenses/${id}`),
  
  getExpenseStats: (tripId: string): Promise<AxiosResponse<ExpenseStats>> =>
    api.get(`/expenses/stats/${tripId}`),
};

// Journals API
export const journalsAPI = {
  getJournals: (tripId: string, params?: { page?: number; limit?: number }): Promise<AxiosResponse<PaginatedResponse<JournalEntry>>> =>
    api.get(`/journals/trip/${tripId}`, { params }),
  
  getJournal: (id: string): Promise<AxiosResponse<{ journal: JournalEntry }>> =>
    api.get(`/journals/${id}`),
  
  createJournal: (data: JournalForm & { trip: string }): Promise<AxiosResponse<{ journal: JournalEntry }>> =>
    api.post('/journals', data),
  
  updateJournal: (id: string, data: Partial<JournalForm>): Promise<AxiosResponse<{ journal: JournalEntry }>> =>
    api.put(`/journals/${id}`, data),
  
  deleteJournal: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/journals/${id}`),
  
  autoGenerateJournal: (tripId: string, date: string): Promise<AxiosResponse<{ journal: JournalEntry }>> =>
    api.post(`/journals/${tripId}/auto-generate/${date}`),
  
  generateTravelogue: (tripId: string): Promise<AxiosResponse<{ travelogue: Travelogue }>> =>
    api.post(`/journals/trip/${tripId}/generate-travelogue`),
};

// Users API
export const usersAPI = {
  searchUsers: (query: string): Promise<AxiosResponse<{ users: User[] }>> =>
    api.get('/users/search', { params: { q: query } }),
};

// File upload utility
export const uploadFile = async (file: File, folder: string = 'general'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.url;
};

export default api;
