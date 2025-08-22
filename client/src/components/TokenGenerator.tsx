import React, { useState } from 'react';
import { collaborationService } from '../services/collaboration';

const TokenGenerator: React.FC = () => {
  const [tripId, setTripId] = useState('');
  const [email, setEmail] = useState('test@example.com');
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const createInvitation = async () => {
    if (!tripId.trim() || !email.trim()) {
      alert('Please enter trip ID and email');
      return;
    }

    setLoading(true);
    try {
      const response = await collaborationService.inviteCollaborator(tripId, {
        email,
        role,
        message: 'Test invitation from token generator'
      });
      setResult({ success: true, data: response });
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Token Generator</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trip ID:
          </label>
          <input
            type="text"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            placeholder="Enter your trip ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role:
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'viewer' | 'editor' | 'admin')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={createInvitation}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Invitation Token'}
        </button>

        {result && (
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="font-medium mb-2">
              {result.success ? 'Success!' : 'Error:'}
            </h3>
            {result.success && result.data.invite_token && (
              <div className="mb-2">
                <strong>Invitation Token:</strong>
                <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-sm break-all">
                  {result.data.invite_token}
                </div>
              </div>
            )}
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenGenerator;