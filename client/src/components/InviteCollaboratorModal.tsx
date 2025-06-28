import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { collaborationService, CollaboratorInvite } from '../services/collaboration';
import EmailVerificationModal from './EmailVerificationModal';
import { 
  XMarkIcon, 
  UserPlusIcon, 
  EnvelopeIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  onInviteSuccess?: () => void;
}

const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  onInviteSuccess
}) => {
  const [invite, setInvite] = useState<CollaboratorInvite>({
    email: '',
    role: 'viewer',
    message: ''
  });
  
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const inviteCollaboratorMutation = useMutation(
    (inviteData: CollaboratorInvite) => 
      collaborationService.inviteCollaborator(tripId, inviteData),
    {
      onSuccess: (data) => {
        // Check if email verification is required
        if (data.verification_required) {
          setVerificationEmail(invite.email);
          setShowVerificationModal(true);
          toast('Email verification required', {
            icon: '📧',
            duration: 4000,
          });
          return;
        }
        
        toast.success('Collaborator invited successfully!');
        if (data.email_sent) {
          toast.success('Invitation email sent!');
        } else if (data.email_enabled === false) {
          toast('Invitation created (email service not configured)', {
            icon: 'ℹ️',
            duration: 4000,
          });
        }
        setInvite({ email: '', role: 'viewer', message: '' });
        onInviteSuccess?.();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to invite collaborator');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    inviteCollaboratorMutation.mutate(invite);
  };

  const roleDescriptions = {
    viewer: 'Can view the trip but cannot make changes',
    editor: 'Can view and edit the trip itinerary',
    admin: 'Can view, edit, and manage collaborators'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <UserPlusIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Invite Collaborator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2 text-left">{tripTitle}</h3>
            <p className="text-sm text-gray-600 text-left">
              Invite someone to collaborate on your trip planning.
            </p>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              <EnvelopeIcon className="h-4 w-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={invite.email}
              onChange={(e) => setInvite(prev => ({ ...prev, email: e.target.value }))}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Role
            </label>
            <select
              value={invite.role}
              onChange={(e) => setInvite(prev => ({ 
                ...prev, 
                role: e.target.value as 'viewer' | 'editor' | 'admin' 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1 text-left">
              {roleDescriptions[invite.role]}
            </p>
          </div>

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              <ChatBubbleLeftIcon className="h-4 w-4 inline mr-1" />
              Personal Message (Optional)
            </label>
            <textarea
              value={invite.message}
              onChange={(e) => setInvite(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a personal message to your invitation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Role Permissions Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 text-left">
              {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)} Permissions:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center text-left">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                View trip details and itinerary
              </li>
              {(invite.role === 'editor' || invite.role === 'admin') && (
                <li className="flex items-center text-left">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  Edit itinerary and trip details
                </li>
              )}
              {invite.role === 'admin' && (
                <>
                  <li className="flex items-center text-left">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Invite other collaborators
                  </li>
                  <li className="flex items-center text-left">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Manage trip settings
                  </li>
                </>
              )}
            </ul>
          </div>
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={inviteCollaboratorMutation.isLoading || !invite.email.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviteCollaboratorMutation.isLoading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
      
      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={verificationEmail}
        onVerificationSent={(email) => {
          toast.success(`Verification email sent to ${email}`);
          setShowVerificationModal(false);
          onClose(); // Close the invite modal too
        }}
      />
    </div>
  );
};

export default InviteCollaboratorModal;
