import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [apiStatus, setApiStatus] = useState('Checking...');

  useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        // Try API through CloudFront first
        let apiUrl = '/api/v1/auth/health';
        let response = await fetch(apiUrl);
        
        if (!response.ok) {
          // Fallback to direct API Gateway URL if available
          const directApiUrl = process.env.REACT_APP_API_URL || '/api/v1/auth/health';
          response = await fetch(directApiUrl);
        }
        
        if (response.ok) {
          const data = await response.json();
          setApiStatus('✅ API Connected');
          setMessage(`Backend: ${data.service || 'Travel Diary API'} v${data.version || '1.0.0'}`);
        } else {
          setApiStatus('❌ API Error');
          setMessage(`Backend API returned status: ${response.status}`);
        }
      } catch (error) {
        setApiStatus('❌ API Offline');
        setMessage(`Cannot connect to backend API: ${error.message}`);
      }
    };

    testAPI();
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>🌍 Travel Diary</h1>
        <p>Your serverless travel companion</p>
      </header>
      
      <main className="main-content">
        <div className="container">
          <h2>Welcome to Travel Diary!</h2>
          <p>Plan your trips, document your adventures, and create lasting memories.</p>
          
          <div className="status-card">
            <h3>System Status</h3>
            <p><strong>Frontend:</strong> ✅ React App Running</p>
            <p><strong>Backend:</strong> {apiStatus}</p>
            <p><strong>Message:</strong> {message}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>

          <div className="features">
            <h3>Features Available</h3>
            <ul>
              <li>✈️ Trip Planning</li>
              <li>📝 Travel Journal</li>
              <li>📸 Photo Gallery</li>
              <li>🗺️ Interactive Maps</li>
              <li>💰 Expense Tracking</li>
              <li>🔐 User Authentication</li>
            </ul>
          </div>

          <div className="actions">
            <button className="btn" onClick={() => window.location.reload()}>
              Refresh Status
            </button>
            <button className="btn" onClick={() => {
              fetch('/api/v1/auth/health')
                .then(res => res.json())
                .then(data => alert(JSON.stringify(data, null, 2)))
                .catch(err => alert('API Error: ' + err.message));
            }}>
              Test API
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
