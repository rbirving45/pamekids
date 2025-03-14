// App.tsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { MobileProvider, useMobile } from './contexts/MobileContext';
import { UIStateProvider } from './contexts/UIStateContext';
import { TouchProvider } from './contexts/TouchContext';
import SEO from './components/SEO';

import MapComponent from './components/Map/Map';
import MapBlockingOverlay from './components/Map/MapBlockingOverlay';
import SuggestActivityButton from './components/SuggestActivity/SuggestActivityButton';
import SuggestActivityModal from './components/SuggestActivity/SuggestActivityModal';
import { NewsletterButton, NewsletterModal } from './components/Newsletter';
import AdminLogin from './components/Admin/AdminLogin';
import Dashboard from './components/Admin/Dashboard';

// Import activity categories from centralized metadata
import { ACTIVITY_CATEGORIES as activityConfig } from './utils/metadata';

// Main application layout
const MainApp = () => {
  const { isMobile } = useMobile();
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  
  return (
    <div className="h-screen w-full flex flex-col">
      <SEO /> {/* Use default SEO values from metadata.ts */}
      <MapBlockingOverlay />
      <header className={`bg-white shadow-md z-header ${isMobile ? 'fixed top-0 left-0 right-0' : 'relative'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative inline-flex items-baseline">
              {/* Main logo text */}
              <span className="font-logo text-4xl md:text-4xl font-bold text-blue-500">Pame</span>
              
              {/* Sub-brand text */}
              <span className="font-logo text-3xl md:text-3xl font-semibold text-orange-500">Kids</span>
            </div>
            <div className="flex items-center space-x-3">
              <NewsletterButton onClick={() => setIsNewsletterModalOpen(true)} />
              <SuggestActivityButton onClick={() => setIsSuggestModalOpen(true)} />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">
        <MapComponent />
      </main>

      <SuggestActivityModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        activityTypes={activityConfig}
      />
      
      <NewsletterModal
        isOpen={isNewsletterModalOpen}
        onClose={() => setIsNewsletterModalOpen(false)}
      />
    </div>
  );
};

function App() {
  // Add debug utility for location issues (accessible via window object)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getLocationIssues = () => {
        try {
          const reports = localStorage.getItem('location_issue_reports');
          return reports ? JSON.parse(reports) : [];
        } catch (e) {
          console.error('Error fetching location issues:', e);
          return [];
        }
      };
    }

    // Inject schema.org structured data for rich search results
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "PameKids",
      "url": "https://www.pamekids.com",
      "description": "Find the best children's activities in Athens, Greece. Indoor play, outdoor activities, sports, arts, music, education and entertainment for kids.",
      "applicationCategory": "Maps & Kids Activities",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "areaServed": {
        "@type": "City",
        "name": "Athens",
        "containedInPlace": {
          "@type": "Country",
          "name": "Greece"
        }
      }
    });
    document.head.appendChild(script);
  }, []);

  return (
    <MobileProvider>
      <UIStateProvider>
        <TouchProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Routes>
              <Route path="/" element={<MainApp />} />
              <Route
                path="/admin"
                element={
                  <>
                    <SEO
                      title="Admin Login"
                      description="PameKids admin login"
                      noIndex={true}
                    />
                    <AdminLogin />
                  </>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <>
                    <SEO
                      title="Admin Dashboard"
                      description="PameKids admin dashboard"
                      noIndex={true}
                    />
                    <Dashboard />
                  </>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </TouchProvider>
      </UIStateProvider>
    </MobileProvider>
  );
}

export default App;