import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { collaborationService } from '../services/collaboration';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const InviteResponsePage: React.FC = () => {
  const { action } = useParams<{ action: 'accept' | 'decline' }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    tripTitle?: string;
  } | null>(null);

  const token = searchParams.get('token');

  const respondToInviteMutation = useMutation(
    collaborationService.respondToInvite,
    {
      onSuccess: (data) => {
        setResult({
          success: true,
          message: `Invitation ${action}ed successfully!`,
          tripTitle: data.trip_title
        });
        toast.success(`Invitation ${action}ed successfully!`);
      },
      onError: (error: any) => {
        setResult({
          success: false,
          message: error.message || `Failed to ${action} invitation`
        });
        toast.error(error.message || `Failed to ${action} invitation`);
      },
      onSettled: () => {
        setIsProcessing(false);
      }
    }
  );

  useEffect(() => {
    if (!token || !action || (action !== 'accept' && action !== 'decline')) {
      setResult({
        success: false,
        message: 'Invalid invitation link'
      });
      return;
    }

    setIsProcessing(true);
    respondToInviteMutation.mutate({
      action,
      invite_token: token
    });
  }, [token, action]);

  const handleGoToTrips = () => {
    navigate('/trips');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-gray-600">
            Processing your invitation response...
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">
            The invitation link is invalid or has expired.
          </p>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {result.success ? (
            <>
              {action === 'accept' ? (
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {action === 'accept' ? 'Invitation Accepted!' : 'Invitation Declined'}
              </h1>
              <p className="text-gray-600 mb-6">
                {action === 'accept' 
                  ? `You've successfully joined the trip${result.tripTitle ? `: ${result.tripTitle}` : ''}. You can now collaborate with other trip members.`
                  : `You've declined the invitation${result.tripTitle ? ` for ${result.tripTitle}` : ''}.`
                }
              </p>
              {action === 'accept' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-800">
                    You can now view and collaborate on this trip. Check your trips dashboard to get started!
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something Went Wrong
              </h1>
              <p className="text-gray-600 mb-6">
                {result.message}
              </p>
            </>
          )}

          <div className="space-y-3">
            {result.success && action === 'accept' && (
              <button
                onClick={handleGoToTrips}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View My Trips
              </button>
            )}
            <button
              onClick={handleGoHome}
              className={`w-full px-6 py-3 rounded-lg font-medium ${
                result.success && action === 'accept'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Go to Home
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact the trip organizer or visit our{' '}
            <a href="/help" className="text-blue-600 hover:text-blue-700">
              help center
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteResponsePage;
