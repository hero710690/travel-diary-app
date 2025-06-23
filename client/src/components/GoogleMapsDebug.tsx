import React, { useEffect, useState } from 'react';

const GoogleMapsDebug: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState<boolean>(false);
  const [placesApiLoaded, setPlacesApiLoaded] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Check if API key is available
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    setApiKey(key || 'NOT_SET');

    // Check if Google Maps is loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      
      // Check if Places API is loaded
      if (window.google.maps.places) {
        setPlacesApiLoaded(true);
      }
    }

    // Listen for Google Maps errors
    const originalError = console.error;
    const originalLog = console.log;
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Google') || message.includes('Maps') || message.includes('Places')) {
        setErrors(prev => [...prev, `ERROR: ${message}`]);
      }
      originalError.apply(console, args);
    };

    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Google') || message.includes('Maps') || message.includes('Places')) {
        setTestResults(prev => [...prev, `LOG: ${message}`]);
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  const testGoogleMapsAPI = () => {
    setTestResults([]);
    setErrors([]);
    
    if (!window.google || !window.google.maps) {
      setErrors(['❌ Google Maps library not loaded']);
      return;
    }

    setTestResults(prev => [...prev, '✅ Google Maps library loaded']);

    if (!window.google.maps.places) {
      setErrors(prev => [...prev, '❌ Google Places library not loaded']);
      return;
    }

    setTestResults(prev => [...prev, '✅ Google Places library loaded']);

    // Test AutocompleteService
    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      setTestResults(prev => [...prev, '✅ AutocompleteService created successfully']);

      // Test a simple query
      autocompleteService.getPlacePredictions(
        {
          input: 'restaurant',
          types: ['establishment']
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            setTestResults(prev => [...prev, `✅ Places search successful: ${predictions?.length || 0} results`]);
          } else {
            setErrors(prev => [...prev, `❌ Places search failed: ${status}`]);
          }
        }
      );
    } catch (error) {
      setErrors(prev => [...prev, `❌ Error creating AutocompleteService: ${error}`]);
    }

    // Test PlacesService
    try {
      const div = document.createElement('div');
      const placesService = new google.maps.places.PlacesService(div);
      setTestResults(prev => [...prev, '✅ PlacesService created successfully']);
    } catch (error) {
      setErrors(prev => [...prev, `❌ Error creating PlacesService: ${error}`]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🔍 Google Maps & Places API Debug</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">API Key Status:</h3>
            <div className={`p-2 rounded ${apiKey === 'NOT_SET' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {apiKey === 'NOT_SET' ? '❌ API Key not set' : '✅ API Key configured'}
            </div>
            {apiKey !== 'NOT_SET' && (
              <div className="text-xs text-gray-500 mt-1">
                Key: {apiKey.substring(0, 10)}...{apiKey.substring(apiKey.length - 4)}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Google Maps Library:</h3>
            <div className={`p-2 rounded ${googleMapsLoaded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {googleMapsLoaded ? '✅ Google Maps loaded' : '❌ Google Maps not loaded'}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Places API Library:</h3>
            <div className={`p-2 rounded ${placesApiLoaded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {placesApiLoaded ? '✅ Places API loaded' : '❌ Places API not loaded'}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Environment:</h3>
            <div className="bg-gray-100 p-2 rounded text-sm">
              <div>Node ENV: {process.env.NODE_ENV}</div>
              <div>API URL: {process.env.REACT_APP_API_URL}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Quick Test:</h3>
            <button
              onClick={testGoogleMapsAPI}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
            >
              🧪 Test Google Maps & Places API
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {testResults.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700">Test Results:</h3>
              <div className="bg-green-50 p-2 rounded max-h-32 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-green-700 text-sm mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700">Errors:</h3>
              <div className="bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} className="text-red-700 text-sm mb-1">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Places API Troubleshooting:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Verify Places API is enabled in Google Cloud Console</li>
              <li>Check API key has Places API permissions</li>
              <li>Ensure billing is enabled (Places API requires billing)</li>
              <li>Check HTTP referrer restrictions include localhost:3000</li>
              <li>Verify quota limits haven't been exceeded</li>
              <li>Check browser console for specific error messages</li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Required Google Cloud APIs:</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>✅ Maps JavaScript API</li>
              <li>✅ Places API (New)</li>
              <li>✅ Geocoding API</li>
            </ul>
            <p className="text-xs text-yellow-600 mt-2">
              Note: Places API requires billing to be enabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsDebug;
