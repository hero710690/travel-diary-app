import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testAPI = async () => {
      try {
        setIsLoading(true);
        const apiUrl = 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/health';
        
        console.log('Testing API URL:', apiUrl);
        const response = await fetch(apiUrl);
        
        console.log('API Response status:', response.status);
        console.log('API Response headers:', response.headers);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response data:', data);
          setApiStatus('✅ Connected');
          setMessage(`${data.service || 'Travel Diary API'} v${data.version || '1.0.0'}`);
        } else {
          const errorText = await response.text();
          console.log('API Error response:', errorText);
          setApiStatus('❌ Error');
          setMessage(`API returned status: ${response.status}`);
        }
      } catch (error) {
        console.error('API Connection error:', error);
        setApiStatus('❌ Offline');
        setMessage(`Cannot connect to backend: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    testAPI();
  }, []);

  const handleTestAPI = async () => {
    try {
      const apiUrl = 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/health';
      console.log('Testing API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        alert('✅ API Connection Successful!\n\n' + JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('API Error response:', errorText);
        alert(`❌ API Error!\nStatus: ${response.status}\nResponse: ${errorText}`);
      }
    } catch (error) {
      console.error('API Test error:', error);
      alert(`❌ API Connection Failed!\nError: ${error.message}`);
    }
  };

  return (
    <div className="App">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>🌍 Travel Diary</h1>
          <p className="hero-subtitle">Your Personal Journey Companion</p>
          <p>Capture memories, plan adventures, and explore the world with our beautiful, serverless travel diary application. Built for wanderers, dreamers, and explorers.</p>
          
          <div className="cta-buttons">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              🚀 Get Started
            </button>
            <button className="btn btn-secondary" onClick={handleTestAPI}>
              🔗 Test Connection
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          
          {/* Features Section */}
          <section className="features-section">
            <h2 className="section-title">Powerful Features for Every Traveler</h2>
            <p className="section-subtitle">
              Transform the way you travel with our comprehensive suite of tools designed to make every journey memorable and every moment worth capturing.
            </p>
            
            <div className="features-grid">
              {[
                {
                  icon: '✈️',
                  title: 'Trip Planning',
                  description: 'Plan your perfect journey with our intuitive trip planner. Set destinations, dates, and create detailed itineraries.'
                },
                {
                  icon: '📝',
                  title: 'Travel Journal',
                  description: 'Document your adventures with rich text entries, photos, and memories that last a lifetime.'
                },
                {
                  icon: '📸',
                  title: 'Photo Gallery',
                  description: 'Organize and showcase your travel photos with smart albums and location-based sorting.'
                },
                {
                  icon: '🗺️',
                  title: 'Interactive Maps',
                  description: 'Visualize your journeys on beautiful interactive maps with route tracking and location pins.'
                },
                {
                  icon: '💰',
                  title: 'Expense Tracking',
                  description: 'Keep track of your travel budget with detailed expense categories and spending analytics.'
                },
                {
                  icon: '🔐',
                  title: 'Secure & Private',
                  description: 'Your travel memories are protected with enterprise-grade security and privacy controls.'
                }
              ].map((feature, index) => (
                <div key={index} className="feature-card">
                  <span className="feature-icon">{feature.icon}</span>
                  <h4 className="feature-title">{feature.title}</h4>
                  <p className="feature-description">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Status Section */}
          <section className="status-section">
            <h3 className="status-title">System Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Frontend Application</span>
                <span className="status-value status-connected">✅ Active</span>
              </div>
              <div className="status-item">
                <span className="status-label">Backend API</span>
                <span className={`status-value ${
                  isLoading ? 'status-checking' : 
                  apiStatus.includes('✅') ? 'status-connected' : 'status-error'
                }`}>
                  {isLoading ? '⏳ Checking...' : apiStatus}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Service</span>
                <span className="status-value">{message}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Environment</span>
                <span className="status-value">🌐 Production</span>
              </div>
              <div className="status-item">
                <span className="status-label">Architecture</span>
                <span className="status-value">🚀 Serverless</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              🔄 Refresh Status
            </button>
            <button className="btn btn-secondary" onClick={handleTestAPI}>
              🧪 Test API Connection
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
