import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initGA } from './utils/analytics';

// Note: Some ESLint warnings are intentionally suppressed in specific files to avoid
// potential side-effects of changing complex dependencies in useEffect/useMemo hooks.

// Initialize Google Analytics after DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initGA();
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