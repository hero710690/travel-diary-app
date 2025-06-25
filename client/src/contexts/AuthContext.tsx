import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginForm, RegisterForm } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginForm) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple, bulletproof isAuthenticated calculation
  const isAuthenticated = Boolean(user && user.email);
  
  console.log('AuthContext - State:', {
    user: !!user,
    loading,
    isAuthenticated,
    userEmail: user?.email,
    userObject: user
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        console.log('AuthContext - Initializing with:', { 
          hasToken: !!token, 
          hasSavedUser: !!savedUser 
        });

        if (token && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('AuthContext - Parsed saved user:', parsedUser);
            
            // Set user immediately for better UX
            setUser(parsedUser);
            
            // Validate token in background
            const response = await authAPI.getMe();
            console.log('AuthContext - Token validation response:', response.data);
            
            // Handle different response structures
            const freshUser = response.data.user || response.data;
            console.log('AuthContext - Fresh user data:', freshUser);
            
            // Update if different
            if (JSON.stringify(freshUser) !== savedUser) {
              setUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
            }
          } catch (error) {
            console.log('AuthContext - Token validation failed:', error);
            // Clear invalid auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          console.log('AuthContext - No stored auth data found');
        }
      } catch (error) {
        console.error('AuthContext - Initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginForm) => {
    try {
      console.log('AuthContext - Starting login...');
      const response = await authAPI.login(data);
      console.log('AuthContext - Login response:', response.data);
      
      // Handle different response structures
      const responseData = response.data;
      const token = responseData.token;
      const userData = responseData.user || responseData;
      
      console.log('AuthContext - Extracted:', { token, userData });

      if (!token) {
        throw new Error('No token received from login');
      }

      if (!userData || !userData.email) {
        throw new Error('Invalid user data received from login');
      }

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      console.log('AuthContext - Login successful, user set:', userData);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('AuthContext - Login error:', error);
      const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterForm) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast.success('Account created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = { ...user, ...response.data } as User;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Update failed';
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
