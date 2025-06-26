import { api } from './api';
import { API_CONFIG } from '../config/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  user: {
    user_id: string;
    email: string;
    name: string;
  };
  token: string;
  message: string;
}

const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_V1}${endpoint}`;
};

// Transform API user to frontend user format
const transformUser = (apiUser: { user_id: string; email: string; name: string }): User => {
  return {
    id: apiUser.user_id,
    email: apiUser.email,
    name: apiUser.name,
    nickname: apiUser.name, // Keep nickname for backward compatibility
  };
};

export const authService = {
  // Register new user
  register: async (data: RegisterRequest): Promise<{ user: User; token: string }> => {
    console.log('🚀 authService.register called with:', data);
    const response = await api.post<AuthResponse>(
      getApiUrl('/auth/register'),
      data
    );
    console.log('✅ authService.register response:', response.data);
    
    return {
      user: transformUser(response.data.user),
      token: response.data.token,
    };
  },

  // Login user
  login: async (data: LoginRequest): Promise<{ user: User; token: string }> => {
    console.log('🚀 authService.login called with:', data);
    const response = await api.post<AuthResponse>(
      getApiUrl('/auth/login'),
      data
    );
    console.log('✅ authService.login response:', response.data);
    
    return {
      user: transformUser(response.data.user),
      token: response.data.token,
    };
  },

  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    console.log('🚀 authService.getCurrentUser called');
    const response = await api.get<{ user: { user_id: string; email: string; name: string } }>(
      getApiUrl('/auth/me')
    );
    console.log('✅ authService.getCurrentUser response:', response.data);
    
    return transformUser(response.data.user);
  },

  // Logout user
  logout: async (): Promise<void> => {
    console.log('🚀 authService.logout called');
    try {
      await api.post(getApiUrl('/auth/logout'));
    } catch (error) {
      console.log('⚠️ Logout API call failed, continuing with local cleanup');
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.log('✅ authService.logout - Local storage cleared');
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken');
    const isAuth = !!token;
    console.log('🔍 authService.isAuthenticated:', isAuth);
    return isAuth;
  },

  // Validate current token with server
  validateToken: async (): Promise<boolean> => {
    console.log('🔍 authService.validateToken called');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No token found in localStorage');
        return false;
      }
      
      // Try to get current user info to validate token
      await api.get(getApiUrl('/auth/me'));
      console.log('✅ Token is valid');
      return true;
    } catch (error: any) {
      console.log('❌ Token validation failed:', error.response?.data);
      if (error.response?.status === 401) {
        console.log('🧹 Clearing invalid token from localStorage');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      return false;
    }
  },

  // Get stored user
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('🔍 authService.getStoredUser:', user);
    return user;
  },

  // Store auth data
  storeAuthData: (user: User, token: string): void => {
    console.log('💾 authService.storeAuthData called with:', { user, token });
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('✅ authService.storeAuthData - Data stored');
  },
};
