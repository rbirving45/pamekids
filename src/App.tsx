// App.tsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { MobileProvider, useMobile } from './contexts/MobileContext';
import { TouchProvider, useTouch } from './contexts/TouchContext';
import { AppStateProvider } from './contexts/AppStateContext';
import SEO from './components/SEO';

import MapComponent from './components/Map/Map';
import MapBlockingOverlay from './components/Map/MapBlockingOverlay';
import SuggestActivityButton from './components/SuggestActivity/SuggestActivityButton';
import SuggestActivityModal from './components/SuggestActivity/SuggestActivityModal';
import { NewsletterButton, NewsletterModal } from './components/Newsletter';
import ReportIssueModal from './components/ReportIssue/ReportIssueModal';
import AdminLogin from './components/Admin/AdminLogin';
import Dashboard from './components/Admin/Dashboard';
import AnalyticsDebugger from './components/Analytics/AnalyticsDebugger';

// Import activity categories from centralized metadata
import { ACTIVITY_CATEGORIES as activityConfig } from './utils/metadata';
import { injectSchemaOrgData } from './utils/schema';

// Interface for Report Issue Modal data
interface ReportIssueData {
  locationId: string;
  locationName: string;
  defaultIssueType: 'pro-tips' | 'incorrect-info' | 'closed-location' | 'inappropriate-content' | 'other';
}

// Main application layout
const MainApp = () => {
  const { isMobile } = useMobile();
  const { setModalOpen } = useTouch();
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [reportIssueData, setReportIssueData] = useState<ReportIssueData>({
    locationId: '',
    locationName: '',
    defaultIssueType: 'pro-tips'
  });

  // Sync modal states with TouchContext
  React.useEffect(() => {
    const isAnyModalOpen = isSuggestModalOpen || isNewsletterModalOpen || isReportIssueModalOpen;
    setModalOpen(isAnyModalOpen);
  }, [isSuggestModalOpen, isNewsletterModalOpen, isReportIssueModalOpen, setModalOpen]);
  
  // Register global function to open report issue modal
  React.useEffect(() => {
    // Define the handler inside the effect to avoid dependency issues
    const handleOpenReportIssueModal = (data: ReportIssueData) => {
      // Set data first
      setReportIssueData(data);
      
      // Explicitly update TouchContext before opening modal
      setModalOpen(true);
      
      // Small delay to ensure TouchContext is updated before modal opens
      setTimeout(() => {
        setIsReportIssueModalOpen(true);
      }, 10);
    };
    
    if (typeof window !== 'undefined') {
      (window as any).openReportIssueModal = (locationId: string, locationName: string, defaultIssueType: string) => {
        const issueType = defaultIssueType as 'pro-tips' | 'incorrect-info' | 'closed-location' | 'inappropriate-content' | 'other';
        handleOpenReportIssueModal({
          locationId,
          locationName,
          defaultIssueType: issueType
        });
      };
    }
    
    // Clean up on unmount
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).openReportIssueModal;
      }
    };
  }, [setReportIssueData, setIsReportIssueModalOpen, setModalOpen]);
  
  return (
    <div className="h-screen w-full flex flex-col">
      <SEO /> {/* Use default SEO values from metadata.ts */}
      <MapBlockingOverlay />
      <header
        className={`bg-white shadow-md z-header ${isMobile ? 'fixed top-0 left-0 right-0' : 'relative'}`}
        onTouchStart={(e) => {
          // Prevent touch events from reaching the map
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // Prevent scrolling and stop propagation
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          // Prevent touch events from reaching the map
          e.stopPropagation();
        }}
        style={{
          touchAction: 'none', // Disable browser handling of all touch events
          pointerEvents: 'auto', // Ensure all pointer events are captured
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 100 // Ensure header is above map
        }}
      >
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
      
      <ReportIssueModal
        isOpen={isReportIssueModalOpen}
        onClose={() => {
          setIsReportIssueModalOpen(false);
          // Add a small delay to ensure TouchContext is updated properly
          setTimeout(() => {
            setModalOpen(false);
          }, 50);
        }}
        locationId={reportIssueData.locationId}
        locationName={reportIssueData.locationName}
        defaultIssueType={reportIssueData.defaultIssueType}
      />
      
      {/* Analytics Debugger - only visible in development or with debug URL param */}
      {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug=analytics')) && (
        <AnalyticsDebugger />
      )}
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
      
      // Add initialization error tracking for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 App initialization started');
        
        // Track initialization errors
        window.addEventListener('error', (event) => {
          console.error('App initialization error:', event.error);
        });
      }
    }

    // Inject schema.org structured data for rich search results
    injectSchemaOrgData();
  }, []);

  // Log when app is mounted
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 App component mounted');
    }
    
    // Add a delayed message to confirm when app is fully rendered
    const timer = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 App rendering completed');
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <MobileProvider>
      <AppStateProvider>
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
      </AppStateProvider>
    </MobileProvider>
  );
}

export default App;