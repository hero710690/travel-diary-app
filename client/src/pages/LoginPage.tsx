import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../types';
import { BookOpenIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  // Force redirect if authenticated (backup to PublicRoute)
  useEffect(() => {
    console.log('LoginPage useEffect - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
    if (!authLoading && isAuthenticated) {
      console.log('LoginPage - User is authenticated, forcing navigation to dashboard');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100); // Small delay to ensure state is fully updated
    }
  }, [isAuthenticated, authLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    mode: 'onSubmit', // Only validate on submit to prevent re-renders
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginForm) => {
    console.log('🔥 FORM SUBMITTED - onSubmit called with data:', data);
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🚀 Starting login attempt:', data);
      
      // Clear any existing auth data before login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.log('🧹 Cleared existing localStorage data');
      
      console.log('📡 About to call login() function...');
      await login(data.email, data.password);
      console.log('✅ Login successful - redirecting to dashboard');
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        window.location.href = '/dashboard';
      }, 100);
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      setIsLoading(false);
    }
    // Don't set loading to false here since we're redirecting
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BookOpenIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Travel Diary</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to your account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form 
            className="space-y-6" 
            onSubmit={(e) => {
              console.log('📝 Form onSubmit event triggered!', e);
              handleSubmit(onSubmit)(e);
            }}
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                autoComplete="email"
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="block w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button 
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                  onClick={() => alert('Forgot password functionality coming soon!')}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                onClick={(e) => {
                  console.log('🖱️ Submit button clicked!', e);
                  console.log('🔍 Form validation state:', errors);
                }}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <div className="text-center text-white">
            <BookOpenIcon className="w-20 h-20 mx-auto mb-6 opacity-80" />
            <h3 className="text-3xl font-bold mb-4">Start Your Journey</h3>
            <p className="text-xl opacity-90">Document your travels and create lasting memories</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
