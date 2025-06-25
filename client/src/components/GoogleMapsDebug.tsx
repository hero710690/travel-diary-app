import React, { useEffect, useState } from 'react';

const GoogleMapsDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const addDebugInfo = (message: string) => {
      console.log(message);
      setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    addDebugInfo('🔍 Starting Google Maps debug...');
    addDebugInfo(`🔑 API Key: ${process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}`);
    
    // Check if Google Maps is available
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined') {
        addDebugInfo(`🌐 Window object: ${window ? 'Available' : 'Not available'}`);
        
        if (window.google) {
          addDebugInfo('✅ window.google is available');
          
          if (window.google.maps) {
            addDebugInfo('✅ window.google.maps is available');
            
            if (window.google.maps.places) {
              addDebugInfo('✅ window.google.maps.places is available');
              
              try {
                const service = new window.google.maps.places.AutocompleteService();
                addDebugInfo('✅ AutocompleteService created successfully');
                
                // Test a simple request
                service.getPlacePredictions(
                  { input: 'Tokyo' },
                  (predictions, status) => {
                    addDebugInfo(`📍 Test search result: ${status}`);
                    if (predictions) {
                      addDebugInfo(`📍 Found ${predictions.length} predictions`);
                    }
                  }
                );
              } catch (error) {
                addDebugInfo(`❌ Error creating AutocompleteService: ${error}`);
              }
            } else {
              addDebugInfo('❌ window.google.maps.places is NOT available');
            }
          } else {
            addDebugInfo('❌ window.google.maps is NOT available');
          }
        } else {
          addDebugInfo('❌ window.google is NOT available');
        }
      } else {
        addDebugInfo('❌ Window object is not available');
      }
    };

    // Check immediately
    checkGoogleMaps();

    // Also check after delays to see if it loads later
    const timeouts = [1000, 3000, 5000];
    timeouts.forEach(delay => {
      setTimeout(() => {
        addDebugInfo(`🔄 Checking again after ${delay}ms...`);
        checkGoogleMaps();
      }, delay);
    });

  }, []);

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Google Maps Debug Info</h3>
      <div className="space-y-1 text-sm font-mono">
        {debugInfo.map((info, index) => (
          <div key={index} className={`${
            info.includes('✅') ? 'text-green-600' : 
            info.includes('❌') ? 'text-red-600' : 
            info.includes('🔄') ? 'text-blue-600' : 
            'text-gray-600'
          }`}>
            {info}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoogleMapsDebug;
