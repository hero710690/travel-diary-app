import React, { useState } from 'react';
import { collaborationService } from '../services/collaboration';

const InviteDebugger: React.FC = () => {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testInviteResponse = async (action: 'accept' | 'decline') => {
    if (!token.trim()) {
      alert('Please enter a token');
      return;
    }

    setLoading(true);
    try {
      const response = await collaborationService.respondToInvite({
        action,
        invite_token: token
      });
      setResult({ success: true, data: response, type: 'collaboration' });
    } catch (error: any) {
      setResult({ success: false, error: error.message, type: 'collaboration' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Invitation Debugger</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitation Token:
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter invitation token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => testInviteResponse('accept')}
            disabled={loading}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            Accept Invitation
          </button>
          <button
            onClick={() => testInviteResponse('decline')}
            disabled={loading}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            Decline Invitation
          </button>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Each invitation token can only be used once. After accepting or declining, the token becomes invalid.
          </p>
        </div>

        {loading && <p>Testing...</p>}

        {result && (
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="font-medium mb-2">
              {result.success ? 'Success!' : 'Error:'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteDebugger;