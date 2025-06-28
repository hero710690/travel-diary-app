import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { collaborationService, ShareSettings, ShareLinkResponse } from '../services/collaboration';
import { 
  XMarkIcon, 
  LinkIcon, 
  ClipboardIcon, 
  EyeIcon, 
  LockClosedIcon,
  CalendarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripTitle
}) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    is_public: false,
    allow_comments: false,
    password_protected: false,
    password: '',
    expires_in_days: 30
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const createShareLinkMutation = useMutation(
    (settings: ShareSettings & { send_email: boolean }) => 
      collaborationService.createShareLink(tripId, settings),
    {
      onSuccess: (data: ShareLinkResponse) => {
        setShareUrl(data.share_link.url);
        toast.success('Share link created successfully!');
        if (data.email_sent) {
          toast.success('Share link sent to your email!');
        }
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create share link');
      }
    }
  );

  const handleCreateShareLink = () => {
    createShareLinkMutation.mutate({
      ...shareSettings,
      send_email: sendEmail
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 text-left">Share Trip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2 text-left">{tripTitle}</h3>
            <p className="text-sm text-gray-600 text-left">
              Create a shareable link to let others view your trip itinerary.
            </p>
          </div>

          {!shareUrl ? (
            <div className="space-y-4">
              {/* Public Access */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <EyeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Public Access</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareSettings.is_public}
                    onChange={(e) => setShareSettings(prev => ({
                      ...prev,
                      is_public: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Password Protection</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareSettings.password_protected}
                      onChange={(e) => setShareSettings(prev => ({
                        ...prev,
                        password_protected: e.target.checked,
                        password: e.target.checked ? prev.password : ''
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {shareSettings.password_protected && (
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={shareSettings.password}
                    onChange={(e) => setShareSettings(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Expiration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Expires in</span>
                </div>
                <select
                  value={shareSettings.expires_in_days}
                  onChange={(e) => setShareSettings(prev => ({
                    ...prev,
                    expires_in_days: parseInt(e.target.value)
                  }))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              {/* Email Notification */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Email me the link</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <LinkIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Share Link Created</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <ClipboardIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 text-left">
                <p>• Link expires in {shareSettings.expires_in_days} days</p>
                <p>• {shareSettings.is_public ? 'Public access' : 'Limited access'}</p>
                {shareSettings.password_protected && <p>• Password protected</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {shareUrl ? 'Close' : 'Cancel'}
          </button>
          {!shareUrl && (
            <button
              onClick={handleCreateShareLink}
              disabled={createShareLinkMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createShareLinkMutation.isLoading ? 'Creating...' : 'Create Share Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareTripModal;
