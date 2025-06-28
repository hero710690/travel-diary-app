import React, { useState } from 'react';
import { XMarkIcon, EnvelopeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerificationSent: (email: string) => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  onVerificationSent
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSendVerification = async () => {
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const response = await fetch('/api/v1/email/request-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        onVerificationSent(email);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send verification email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">📧 Email Verification Required</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <EnvelopeIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Verification Required
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Before we can send invitations to <strong>{email}</strong>, 
                    they need to verify their email address.
                  </p>
                </div>
              </div>
            </div>

            {status === 'success' && (
              <div className="bg-green-50 p-4 rounded-md">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">
                      Verification Email Sent!
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 p-4 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">
                      Error
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p className="mb-2">Here's what happens next:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>We'll send a verification email to <strong>{email}</strong></li>
                <li>They click the verification link in the email</li>
                <li>Once verified, they can receive trip invitations</li>
              </ol>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            {status !== 'success' && (
              <button
                onClick={handleSendVerification}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Verification Email'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
