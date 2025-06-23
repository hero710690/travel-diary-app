import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [apiStatus, setApiStatus] = useState('Checking...');

  useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const response = await fetch('/api/v1/auth/health');
        if (response.ok) {
          const data = await response.json();
          setApiStatus('✅ API Connected');
          setMessage(`Backend: ${data.service} v${data.version}`);
        } else {
          setApiStatus('❌ API Error');
          setMessage('Backend API not responding');
        }
      } catch (error) {
        setApiStatus('❌ API Offline');
        setMessage('Cannot connect to backend API');
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
          </div>

          <div className="features">
            <h3>Features Coming Soon</h3>
            <ul>
              <li>✈️ Trip Planning</li>
              <li>📝 Travel Journal</li>
              <li>📸 Photo Gallery</li>
              <li>🗺️ Interactive Maps</li>
              <li>💰 Expense Tracking</li>
            </ul>
          </div>

          <button className="btn" onClick={() => window.location.reload()}>
            Refresh Status
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
