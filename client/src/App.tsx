import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TestPage from './pages/TestPage';
import TripDetailPage from './pages/TripDetailPage';
import CreateTripPage from './pages/CreateTripPage';
import EditTripPage from './pages/EditTripPage';
import TripPlanningPage from './pages/TripPlanningPage';
import ProfilePage from './pages/ProfilePage';
import SharedTripPage from './pages/SharedTripPage';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import GoogleMapsDebug from './components/GoogleMapsDebug';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, user, isAuthenticated } = useAuth();

  console.log('ProtectedRoute - Check:', { 
    loading, 
    user: !!user, 
    isAuthenticated,
    userEmail: user?.email
  });

  if (loading) {
    console.log('ProtectedRoute - Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - Authenticated, rendering content');
  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('PublicRoute - Check:', { 
    isAuthenticated, 
    loading
  });

  if (loading) {
    console.log('PublicRoute - Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('PublicRoute - Authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('PublicRoute - Not authenticated, showing public content');
  return <>{children}</>;
};

// Home Route Component - shows login if not authenticated, dashboard if authenticated
const HomeRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Home Route - redirects based on auth status */}
        <Route path="/" element={<HomeRoute />} />
        
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />
        
        {/* Shared Trip Route (no auth required) */}
        <Route path="/trips/shared/:token" element={<SharedTripPage />} />

        {/* Test Route for debugging login redirect */}
        <Route path="/test" element={<TestPage />} />

        {/* Direct Dashboard Route for testing (bypasses ProtectedRoute) */}
        <Route path="/dashboard-direct" element={
          <Layout>
            <DashboardPage />
          </Layout>
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/trips/new" element={
          <ProtectedRoute>
            <Layout>
              <CreateTripPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/trips/:id/edit" element={
          <ProtectedRoute>
            <Layout>
              <EditTripPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/trips/:id/plan" element={
          <ProtectedRoute>
            <Layout>
              <TripPlanningPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/trips/:id" element={
          <ProtectedRoute>
            <Layout>
              <TripDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Debug Route */}
        <Route path="/debug/maps" element={
          <div className="min-h-screen bg-gray-50 py-8">
            <GoogleMapsDebug />
          </div>
        } />

        {/* 404 Route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">Page not found</p>
              <a href="/" className="text-blue-600 hover:text-blue-800">
                Go back to home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
