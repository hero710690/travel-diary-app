import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

console.log('🔥🔥🔥 INDEX.TSX LOADED - About to import AuthProvider');

// Test import
try {
  console.log('🔥🔥🔥 INDEX.TSX - Attempting to require AuthProvider...');
  const AuthContextModule = require('./contexts/AuthContext');
  console.log('🔥🔥🔥 INDEX.TSX - AuthProvider required successfully:', AuthContextModule);
} catch (error) {
  console.error('🚨 INDEX.TSX - Failed to require AuthProvider:', error);
}

console.log('🔥🔥🔥 INDEX.TSX - AuthProvider import completed');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

console.log('🔥🔥🔥 INDEX.TSX - AuthProvider rendered');
