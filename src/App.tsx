// App.tsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { MobileProvider } from './contexts/MobileContext';
import { TouchProvider, useTouch } from './contexts/TouchContext';
import { AppStateProvider } from './contexts/AppStateContext';
import SEO from './components/SEO';
import HomePage from './components/Home/HomePage';

import MapComponent from './components/Map/Map';
import MapBlockingOverlay from './components/Map/MapBlockingOverlay';
import SuggestActivityModal from './components/SuggestActivity/SuggestActivityModal';
import { NewsletterModal } from './components/Newsletter';
import ReportIssueModal from './components/ReportIssue/ReportIssueModal';
import AdminLogin from './components/Admin/AdminLogin';
import Dashboard from './components/Admin/Dashboard';
import AnalyticsDebugger from './components/Analytics/AnalyticsDebugger';
import Header from './components/Layout/Header';
import { Location } from './types/location';

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
  const { setModalOpen } = useTouch();
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
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
  
  // Fetch locations for search functionality
  React.useEffect(() => {
    // Try to get locations from session storage first
    const cachedLocations = sessionStorage.getItem('cachedLocations');
    if (cachedLocations) {
      try {
        const parsedLocations = JSON.parse(cachedLocations);
        setLocations(parsedLocations);
      } catch (error) {
        console.error('Error parsing cached locations:', error);
      }
    }
    
    // We'll rely on MapComponent to update the locations in session storage
    // This avoids duplicating the fetch logic
  }, []);
  
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
        locations={locations}
        onNewsletterClick={() => setIsNewsletterModalOpen(true)}
        onSuggestActivityClick={() => setIsSuggestModalOpen(true)}
        onLocationSelect={(location) => {
          // Handle location selection from search
          // This would typically be handled by MapComponent
          // We can pass the location to MapComponent via its ref or props
          // For now we'll just log it
          console.log('Location selected from search:', location);
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
              <Route path="/home" element={<HomePage />} />
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