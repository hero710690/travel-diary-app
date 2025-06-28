import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await fetch(`/api/v1/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
          setEmail(data.email || '');
        } else {
          if (data.expired) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
          setMessage(data.message || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <LoadingSpinner />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Verifying your email...
            </h2>
            <p className="mt-2 text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ Email Verified Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            {email && (
              <p className="text-sm text-gray-500 mb-6">
                <strong>{email}</strong> is now verified and can receive trip invitations.
              </p>
            )}
            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </Link>
              <div>
                <Link
                  to="/"
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ⏰ Verification Link Expired
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="bg-yellow-50 p-4 rounded-md mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Don't worry!</strong> You can request a new verification email 
                when someone tries to invite you to a trip.
              </p>
            </div>
            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </Link>
              <div>
                <Link
                  to="/"
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ❌ Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="bg-red-50 p-4 rounded-md mb-6">
              <p className="text-sm text-red-800">
                The verification link may be invalid or have already been used. 
                Please request a new verification email.
              </p>
            </div>
            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </Link>
              <div>
                <Link
                  to="/"
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">✈️ Travel Diary</h1>
          <p className="text-gray-600">Email Verification</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
