import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { 
  XMarkIcon,
  ShareIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { sharingService, ShareSettings } from '../services/sharing';
import { toast } from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, tripId, tripTitle }) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    is_public: true,
    password: '',
    allow_editing: false,
    expires_at: undefined
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get existing share link
  const { data: existingShareLink, isLoading } = useQuery(
    ['shareLink', tripId],
    () => sharingService.getShareLink(tripId),
    {
      enabled: isOpen,
      onSuccess: (data) => {
        if (data) {
          setShareSettings(data.settings);
          setShowPassword(!!data.settings.password);
        }
      }
    }
  );

  // Create share link mutation
  const createShareLinkMutation = useMutation(
    (settings: ShareSettings) => sharingService.createShareLink(tripId, settings),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(['shareLink', tripId], data);
        toast.success('Share link created successfully!');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create share link');
      }
    }
  );

  // Update share settings mutation
  const updateShareSettingsMutation = useMutation(
    (settings: ShareSettings) => sharingService.updateShareSettings(tripId, settings),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(['shareLink', tripId], data);
        toast.success('Share settings updated successfully!');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update share settings');
      }
    }
  );

  // Revoke share link mutation
  const revokeShareLinkMutation = useMutation(
    () => sharingService.revokeShareLink(tripId),
    {
      onSuccess: () => {
        queryClient.setQueryData(['shareLink', tripId], null);
        toast.success('Share link revoked successfully!');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to revoke share link');
      }
    }
  );

  const handleCreateOrUpdateShareLink = () => {
    const settings = {
      ...shareSettings,
      password: showPassword ? shareSettings.password : undefined
    };

    if (existingShareLink) {
      updateShareSettingsMutation.mutate(settings);
    } else {
      createShareLinkMutation.mutate(settings);
    }
  };

  const handleCopyLink = async (url: string, type: string) => {
    try {
      await sharingService.copyToClipboard(url);
      setCopiedUrl(url);
      toast.success(`${type} link copied to clipboard!`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link to clipboard');
    }
  };

  const getViewUrl = () => {
    if (!existingShareLink) return '';
    return sharingService.generateShareUrl(
      existingShareLink.token, 
      shareSettings.password || undefined
    );
  };

  const getEditUrl = () => {
    if (!existingShareLink) return '';
    return sharingService.generateEditableShareUrl(
      existingShareLink.token, 
      shareSettings.password || undefined
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <ShareIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Share Trip</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Trip Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 text-left">{tripTitle}</h4>
            <p className="text-sm text-gray-600 text-left">
              Share this trip with others to collaborate or let them view your plans
            </p>
          </div>

          {/* Share Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 text-left">Share Settings</h4>
            
            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {shareSettings.is_public ? (
                  <LockOpenIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {shareSettings.is_public ? 'Public Link' : 'Private Link'}
                </span>
              </div>
              <button
                onClick={() => setShareSettings(prev => ({ ...prev, is_public: !prev.is_public }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  shareSettings.is_public ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    shareSettings.is_public ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Password Protection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Password Protection</span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showPassword ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showPassword ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {showPassword && (
                <input
                  type="password"
                  value={shareSettings.password || ''}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            </div>

            {/* Allow Editing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {shareSettings.allow_editing ? (
                  <PencilIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {shareSettings.allow_editing ? 'Allow Editing' : 'View Only'}
                </span>
              </div>
              <button
                onClick={() => setShareSettings(prev => ({ ...prev, allow_editing: !prev.allow_editing }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  shareSettings.allow_editing ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    shareSettings.allow_editing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Links */}
          {existingShareLink && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 text-left">Share Links</h4>
              
              {/* View Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <EyeIcon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">View Link</span>
                  </div>
                  <button
                    onClick={() => handleCopyLink(getViewUrl(), 'View')}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {copiedUrl === getViewUrl() ? (
                      <CheckIcon className="h-3 w-3" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3 w-3" />
                    )}
                    <span>{copiedUrl === getViewUrl() ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all">{getViewUrl()}</p>
              </div>

              {/* Edit Link (if editing is allowed) */}
              {shareSettings.allow_editing && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <PencilIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Edit Link</span>
                    </div>
                    <button
                      onClick={() => handleCopyLink(getEditUrl(), 'Edit')}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      {copiedUrl === getEditUrl() ? (
                        <CheckIcon className="h-3 w-3" />
                      ) : (
                        <ClipboardDocumentIcon className="h-3 w-3" />
                      )}
                      <span>{copiedUrl === getEditUrl() ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 break-all">{getEditUrl()}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    This link allows others to edit your trip in the planning page
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {existingShareLink && (
                <button
                  onClick={() => revokeShareLinkMutation.mutate()}
                  disabled={revokeShareLinkMutation.isLoading}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {revokeShareLinkMutation.isLoading ? 'Revoking...' : 'Revoke Link'}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdateShareLink}
                disabled={createShareLinkMutation.isLoading || updateShareSettingsMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createShareLinkMutation.isLoading || updateShareSettingsMutation.isLoading
                  ? 'Saving...'
                  : existingShareLink
                  ? 'Update Link'
                  : 'Create Link'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
