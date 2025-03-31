import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initGA } from './utils/analytics';

// Note: Some ESLint warnings are intentionally suppressed in specific files to avoid
// potential side-effects of changing complex dependencies in useEffect/useMemo hooks.

// Initialize Google Analytics as early as possible
// App name: PameKids
if (typeof window !== 'undefined') {
  // Initialize immediately instead of waiting for DOMContentLoaded
  // This ensures we capture the initial page view
  initGA();
  
  // Also set up route change tracking for single page application
  window.addEventListener('popstate', () => {
    // Check for analytics consent before tracking page views
    const hasAnalyticsConsent = localStorage.getItem('pamekids_analytics_consent') === 'true';
    
    if (typeof window.gtag === 'function' && hasAnalyticsConsent) {
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    }
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);