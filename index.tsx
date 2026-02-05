// CRITICAL: Import console polyfill FIRST before any other imports
// This intercepts console.error/warn/log to prevent "Cannot convert object to primitive value" errors
import './console-polyfill';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // Temporarily disabled StrictMode to prevent double initialization of Google OAuth
  // Re-enable in production if needed
  // <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  // </React.StrictMode>
);