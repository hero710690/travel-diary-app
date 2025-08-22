import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { invitationService, InvitationDetails } from '../services/invitationService';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserGroupIcon, 
  MapPinIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, setUser } = useAuth();
  
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Get invitation details
  const { 
    data: invitationDetails, 
    isLoading: isLoadingInvitation, 
    error: invitationError 
  } = useQuery<InvitationDetails>(
    ['invitation', token],
    () => invitationService.getInvitationDetails(token!),
    {
      enabled: !!token,
      retry: false
    }
  );

  // Register with invitation mutation
  const registerMutation = useMutation(
    invitationService.registerWithInvite,
    {
      onSuccess: (data) => {
        toast.success('Account created successfully! Welcome to the trip!');
        setUser(data.user, data.token);
        // Redirect to trip planning page with edit access
        navigate(`/trips/${data.trip_access.trip_id}/plan`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create account');
      }
    }
  );

  // Accept invitation mutation (for existing users)
  const acceptInvitationMutation = useMutation(
    invitationService.acceptInvitation,
    {
      onSuccess: (data) => {
        toast.success('Invitation accepted! Welcome to the trip!');
        // Redirect to trip planning page
        navigate(`/trips/${data.trip_id}/plan`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to accept invitation');
      }
    }
  );

  // Login mutation
  const loginMutation = useMutation(
    authService.login,
    {
      onSuccess: (data) => {
        setUser(data.user, data.token);
        // After login, accept the invitation
        if (token) {
          acceptInvitationMutation.mutate(token);
        }
      },
      onError: (error: any) => {
        toast.error(error.message || 'Login failed');
      }
    }
  );

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registrationData.password !== registrationData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid invitation token');
      return;
    }

    registerMutation.mutate({
      name: registrationData.name,
      email: registrationData.email,
      password: registrationData.password,
      invite_token: token
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleAcceptInvitation = () => {
    if (!token) {
      toast.error('Invalid invitation token');
      return;
    }
    acceptInvitationMutation.mutate(token);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <UserPlusIcon className="h-5 w-5 text-purple-600" />;
      case 'editor':
        return <PencilIcon className="h-5 w-5 text-blue-600" />;
      case 'viewer':
        return <EyeIcon className="h-5 w-5 text-green-600" />;
      default:
        return <UserGroupIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access - can view, edit, and manage the trip';
      case 'editor':
        return 'Can view and edit the trip itinerary';
      case 'viewer':
        return 'Can view the trip details (read-only)';
      default:
        return 'Collaborator access';
    }
  };

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (invitationError || !invitationDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is already logged in, show accept invitation
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-center">You're Invited!</h1>
              <p className="text-blue-100 text-center mt-2">
                Join this amazing trip as a collaborator
              </p>
            </div>

            {/* Trip Details */}
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {invitationDetails.trip.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  {invitationDetails.trip.description}
                </p>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span>{invitationDetails.trip.destination}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {new Date(invitationDetails.trip.start_date).toLocaleDateString()} - {' '}
                      {new Date(invitationDetails.trip.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  {getRoleIcon(invitationDetails.invitation.role)}
                  <span className="ml-2 font-medium text-gray-900 capitalize">
                    {invitationDetails.invitation.role} Access
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(invitationDetails.invitation.role)}
                </p>
              </div>

              {/* Inviter Information */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Invited by <span className="font-medium">{invitationDetails.invitation.inviter_name}</span>
                </p>
                {invitationDetails.invitation.message && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      "{invitationDetails.invitation.message}"
                    </p>
                  </div>
                )}
              </div>

              {/* Accept Button */}
              <button
                onClick={handleAcceptInvitation}
                disabled={acceptInvitationMutation.isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {acceptInvitationMutation.isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Accepting...</span>
                  </div>
                ) : (
                  'Accept Invitation & Join Trip'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For non-logged-in users, show registration/login options
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-center">You're Invited!</h1>
            <p className="text-blue-100 text-center mt-2">
              Join this amazing trip as a collaborator
            </p>
          </div>

          {/* Trip Details */}
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {invitationDetails.trip.title}
              </h2>
              <p className="text-gray-600 mb-4">
                {invitationDetails.trip.description}
              </p>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  <span>{invitationDetails.trip.destination}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>
                    {new Date(invitationDetails.trip.start_date).toLocaleDateString()} - {' '}
                    {new Date(invitationDetails.trip.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Role Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                {getRoleIcon(invitationDetails.invitation.role)}
                <span className="ml-2 font-medium text-gray-900 capitalize">
                  {invitationDetails.invitation.role} Access
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {getRoleDescription(invitationDetails.invitation.role)}
              </p>
            </div>

            {/* Inviter Information */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Invited by <span className="font-medium">{invitationDetails.invitation.inviter_name}</span>
              </p>
              {invitationDetails.invitation.message && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    "{invitationDetails.invitation.message}"
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!showRegistration && !showLogin && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowRegistration(true)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Account & Join Trip
                </button>
                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  I Already Have an Account
                </button>
              </div>
            )}

            {/* Registration Form */}
            {showRegistration && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={registrationData.email}
                    onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData({ ...registrationData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Create a password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={registrationData.confirmPassword}
                    onChange={(e) => setRegistrationData({ ...registrationData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm your password"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={registerMutation.isLoading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {registerMutation.isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </div>
                    ) : (
                      'Create Account & Join'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegistration(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Login Form */}
            {showLogin && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loginMutation.isLoading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loginMutation.isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Signing In...</span>
                      </div>
                    ) : (
                      'Sign In & Join Trip'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;
