import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';

export interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User, token: string) => void;
}

// PRODUCTION MODE - Start with no user, require real authentication
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  console.log('🔍 useAuth called - context:', context);
  
  if (!context) {
    console.error('❌ useAuth must be used within an AuthProvider - context is undefined!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  console.log('🔥🔥🔥 AuthProvider RENDERED - State:', state);
  console.log('🔥🔥🔥 AuthProvider RENDERED - initialState was:', initialState);

  // Check for existing auth on mount
  useEffect(() => {
    console.log('🚀 AuthProvider useEffect - Running...');
    console.log('🚀 AuthProvider useEffect - Current state:', state);
    
    const checkAuth = async () => {
      console.log('🚀 AuthProvider - Checking existing auth (PRODUCTION MODE)...');
      
      // PRODUCTION MODE - Check for real authentication
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          
          if (storedUser) {
            try {
              // Verify token is still valid
              console.log('🔍 Verifying stored token...');
              const currentUser = await authService.getCurrentUser();
              console.log('✅ Token valid, user authenticated:', currentUser);
              dispatch({ type: 'AUTH_SUCCESS', payload: currentUser });
            } catch (error) {
              // Token is invalid, clear storage
              console.log('❌ Token invalid, clearing storage');
              authService.logout();
              dispatch({ type: 'AUTH_LOGOUT' });
            }
          } else {
            console.log('📝 No stored user found');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          console.log('🔓 No authentication found');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.log('❌ Auth check error:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          
          if (storedUser) {
            try {
              // Verify token is still valid
              const currentUser = await authService.getCurrentUser();
              dispatch({ type: 'AUTH_SUCCESS', payload: currentUser });
            } catch (error) {
              // Token is invalid, clear storage
              authService.logout();
              dispatch({ type: 'AUTH_LOGOUT' });
            }
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          console.log('🔓 No authentication found');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.log('❌ Auth check error:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔥🔥🔥 AuthProvider LOGIN CALLED (PRODUCTION MODE)!', { email });
    dispatch({ type: 'AUTH_START' });
    
    try {
      // PRODUCTION MODE - Real API login
      console.log('🚀 Attempting real login...');
      const response = await authService.login({ email, password });
      console.log('✅ Login successful:', response.user);
      authService.storeAuthData(response.user, response.token);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      console.log('❌ Login failed:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const register = async (email: string, password: string, nickname?: string): Promise<void> => {
    console.log('🔥🔥🔥 AuthProvider REGISTER CALLED (PRODUCTION MODE)!', { email, nickname });
    dispatch({ type: 'AUTH_START' });
    
    try {
      // PRODUCTION MODE - Real API registration
      console.log('🚀 Attempting real registration...');
      const response = await authService.register({ email, password, nickname });
      console.log('✅ Registration successful:', response.user);
      authService.storeAuthData(response.user, response.token);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      console.log('❌ Registration failed:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🔥🔥🔥 AuthProvider LOGOUT CALLED (PRODUCTION MODE)');
    
    try {
      // PRODUCTION MODE - Real API logout
      console.log('🚀 Attempting real logout...');
      await authService.logout();
      console.log('✅ Logout successful');
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.log('❌ Logout error (proceeding anyway):', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setUser = (user: User, token: string): void => {
    console.log('🔥🔥🔥 AuthProvider SET_USER CALLED (PRODUCTION MODE)!', { user });
    authService.storeAuthData(user, token);
    dispatch({ type: 'AUTH_SUCCESS', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    setUser,
  };

  console.log('🔥🔥🔥 AuthProvider - Providing context value (PRODUCTION MODE):', value);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
