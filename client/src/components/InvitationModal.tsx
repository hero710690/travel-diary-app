import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { collaborationService } from '../services/collaboration';
import { 
  XMarkIcon, 
  UserGroupIcon, 
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripTitle
}) => {
  const [invitationType, setInvitationType] = useState<'link' | 'email'>('link');
  const [formData, setFormData] = useState({
    email: '',
    role: 'editor' as 'viewer' | 'editor' | 'admin',
    message: '',
    expires_in_days: 7,
    allow_signup: true
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const createInvitationMutation = useMutation(
    (inviteData: { email: string; role: 'viewer' | 'editor' | 'admin'; message?: string }) =>
      collaborationService.inviteCollaborator(tripId, inviteData),
    {
      onSuccess: (data) => {
        // Generate the invitation URL in the correct format
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/invite/accept?token=${data.invite_token}`;
        setGeneratedLink(inviteUrl);
        toast.success('Invitation link created successfully!');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create invitation link');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const inviteData = {
      email: formData.email || 'placeholder@example.com', // Use placeholder for link invitations
      role: formData.role,
      message: formData.message || undefined
    };

    createInvitationMutation.mutate(inviteData);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedLink('');
    setFormData({
      email: '',
      role: 'editor',
      message: '',
      expires_in_days: 7,
      allow_signup: true
    });
    setCopied(false);
    onClose();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <UserPlusIcon className="h-4 w-4" />;
      case 'editor':
        return <PencilIcon className="h-4 w-4" />;
      case 'viewer':
        return <EyeIcon className="h-4 w-4" />;
      default:
        return <UserGroupIcon className="h-4 w-4" />;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Invite Collaborators
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedLink ? (
            <>
              {/* Trip Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-1">{tripTitle}</h3>
                <p className="text-sm text-blue-700">
                  Create an invitation link to let others join and collaborate on this trip
                </p>
              </div>

              {/* Invitation Type Toggle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Invitation Type
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setInvitationType('link')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      invitationType === 'link'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <LinkIcon className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Shareable Link</div>
                    <div className="text-xs text-gray-500">Anyone with the link</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvitationType('email')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      invitationType === 'email'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <EnvelopeIcon className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Email Invite</div>
                    <div className="text-xs text-gray-500">Specific person</div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email field for email invitations */}
                {invitationType === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required={invitationType === 'email'}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Level
                  </label>
                  <div className="space-y-2">
                    {(['viewer', 'editor', 'admin'] as const).map((role) => (
                      <label key={role} className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={formData.role === role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {getRoleIcon(role)}
                            <span className="ml-2 font-medium text-gray-900 capitalize">
                              {role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {getRoleDescription(role)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Allow Signup Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allow_signup"
                    checked={formData.allow_signup}
                    onChange={(e) => setFormData({ ...formData, allow_signup: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="allow_signup" className="text-sm text-gray-700">
                    Allow new users to create accounts through this invitation
                  </label>
                </div>

                {/* Personal Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Add a personal message to your invitation..."
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Expires In
                  </label>
                  <select
                    value={formData.expires_in_days}
                    onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>1 week</option>
                    <option value={14}>2 weeks</option>
                    <option value={30}>1 month</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createInvitationMutation.isLoading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {createInvitationMutation.isLoading ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </div>
                    ) : (
                      'Create Invitation Link'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Generated Link Display */
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Invitation Link Created!
                </h3>
                <p className="text-gray-600">
                  Share this link with people you want to collaborate on your trip
                </p>
              </div>

              {/* Generated Link */}
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-600 mb-1">Invitation Link:</p>
                      <p className="text-sm font-mono text-gray-900 break-all">
                        {generatedLink}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className={`ml-3 p-2 rounded-lg transition-colors ${
                        copied
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {copied ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Share this link with people you want to collaborate with</li>
                  <li>• They can create a new account or sign in with an existing one</li>
                  <li>• Once they join, they'll have {formData.role} access to your trip</li>
                  <li>• The link expires in {formData.expires_in_days} day{formData.expires_in_days > 1 ? 's' : ''}</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;
