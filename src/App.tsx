// App.tsx
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { MobileProvider } from './contexts/MobileContext';
import { TouchProvider, useTouch } from './contexts/TouchContext';
import { AppStateProvider } from './contexts/AppStateContext';
import UserLocationProvider from './contexts/UserLocationContext';
import ConsentProvider, { useConsent } from './contexts/ConsentContext';
import SEO from './components/SEO';
import HomePage from './components/Home/HomePage';

import MapComponent from './components/Map/Map';
import MapBlockingOverlay from './components/Map/MapBlockingOverlay';
import SuggestActivityModal from './components/SuggestActivity/SuggestActivityModal';
import { NewsletterModal } from './components/Newsletter';
import ReportIssueModal from './components/ReportIssue/ReportIssueModal';
import WelcomeModal from './components/WelcomeModal/WelcomeModal';
import AdminLogin from './components/Admin/AdminLogin';
import Dashboard from './components/Admin/Dashboard';
import AnalyticsDebugger from './components/Analytics/AnalyticsDebugger';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
// Import activity categories from centralized metadata
import { ACTIVITY_CATEGORIES as activityConfig } from './utils/metadata';
import { injectSchemaOrgData } from './utils/schema';
import { updateAnalyticsConsent } from './utils/analytics';

// Interface for Report Issue Modal data
interface ReportIssueData {
  locationId: string;
  locationName: string;
  defaultIssueType: 'pro-tips' | 'incorrect-info' | 'closed-location' | 'inappropriate-content' | 'other';
}

// Component to handle the welcome modal and consent management
const WelcomeModalWrapper: React.FC = () => {
  const {
    hasShownWelcomeModal,
    setHasShownWelcomeModal,
    analyticsConsent,
    locationConsent
  } = useConsent();
  
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  
  // Show welcome modal for new users or users who haven't made consent decisions
  useEffect(() => {
    // Debug logging to understand modal visibility conditions
    console.log('GDPR Modal Debug:', {
      hasShownWelcomeModal,
      analyticsConsent,
      locationConsent,
      shouldShowModal: !hasShownWelcomeModal && (analyticsConsent === null || locationConsent === null)
    });
    
    // Only show the modal if the user hasn't seen it and hasn't already set preferences
    if (!hasShownWelcomeModal && (analyticsConsent === null || locationConsent === null)) {
      console.log('GDPR Modal: Conditions met to show modal');
      // Small delay to allow the app to load first
      const timer = setTimeout(() => {
        console.log('GDPR Modal: Setting modal to open after timeout');
        setIsWelcomeModalOpen(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.log('GDPR Modal: Conditions not met to show modal');
    }
  }, [hasShownWelcomeModal, analyticsConsent, locationConsent]);
  
  // Sync analytics consent between our system and the analytics module
  useEffect(() => {
    if (analyticsConsent !== null) {
      updateAnalyticsConsent(analyticsConsent);
    }
  }, [analyticsConsent]);
  
  return (
    <WelcomeModal
      isOpen={isWelcomeModalOpen}
      onClose={() => {
        setIsWelcomeModalOpen(false);
        // Mark modal as shown even if user closes it without making a choice
        setHasShownWelcomeModal(true);
      }}
    />
  );
};

// Main application layout
const MainApp = () => {
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
      <Header
        onLocationSelect={(location, index) => {
          // Find the Map component and trigger its location selection
          // This simulates clicking on the marker for this location
          if (typeof window !== 'undefined' && window.openLocationDetail) {
            window.openLocationDetail(location, 'search_result');
          } else {
            console.log('Location selected from search but openLocationDetail is not available:', location);
            // If window.openLocationDetail isn't available, navigate to the location using URL parameters
            window.location.href = `/map?locationId=${location.id}`;
          }
        }}
      />
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
    <ConsentProvider>
      <MobileProvider>
        <UserLocationProvider>
          <AppStateProvider>
            <TouchProvider>
              <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
            {/* Welcome and GDPR Consent Modal - Now visible on all routes */}
            <WelcomeModalWrapper />
            
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/map" element={<MainApp />} />
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
                    <Footer />
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
                    <Footer />
                  </>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          </TouchProvider>
        </AppStateProvider>
      </UserLocationProvider>
    </MobileProvider>
    </ConsentProvider>
  );
}

export default App;