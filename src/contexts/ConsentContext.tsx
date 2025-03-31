import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the shape of our consent context
interface ConsentContextType {
  // Consent states
  analyticsConsent: boolean | null;
  locationConsent: boolean | null;
  hasShownWelcomeModal: boolean;
  
  // Functions to update consent
  setAnalyticsConsent: (consent: boolean | null) => void;
  setLocationConsent: (consent: boolean | null) => void;
  setHasShownWelcomeModal: (hasShown: boolean) => void;
  
  // Function to update all consent settings at once
  updateAllConsent: (analytics: boolean, location: boolean) => void;
}

// Create the context with default values
const ConsentContext = createContext<ConsentContextType>({
  analyticsConsent: null,
  locationConsent: null,
  hasShownWelcomeModal: false,
  
  setAnalyticsConsent: () => {},
  setLocationConsent: () => {},
  setHasShownWelcomeModal: () => {},
  updateAllConsent: () => {},
});

// Custom hook for easy context usage
export const useConsent = () => useContext(ConsentContext);

// Provider component that will wrap the app
export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage if available, otherwise null (undecided)
  const [analyticsConsent, setAnalyticsConsentState] = useState<boolean | null>(() => {
    const savedConsent = localStorage.getItem('pamekids_analytics_consent');
    return savedConsent ? savedConsent === 'true' : null;
  });
  
  const [locationConsent, setLocationConsentState] = useState<boolean | null>(() => {
    const savedConsent = localStorage.getItem('pamekids_location_consent');
    return savedConsent ? savedConsent === 'true' : null;
  });
  
  const [hasShownWelcomeModal, setHasShownWelcomeModalState] = useState<boolean>(() => {
    return localStorage.getItem('pamekids_welcome_shown') === 'true';
  });
  
  // Update localStorage when consent changes
  useEffect(() => {
    if (analyticsConsent !== null) {
      localStorage.setItem('pamekids_analytics_consent', analyticsConsent.toString());
    }
  }, [analyticsConsent]);
  
  useEffect(() => {
    if (locationConsent !== null) {
      localStorage.setItem('pamekids_location_consent', locationConsent.toString());
    }
  }, [locationConsent]);
  
  useEffect(() => {
    localStorage.setItem('pamekids_welcome_shown', hasShownWelcomeModal.toString());
  }, [hasShownWelcomeModal]);
  
  // Wrapper functions to update state
  const setAnalyticsConsent = (consent: boolean | null) => {
    setAnalyticsConsentState(consent);
  };
  
  const setLocationConsent = (consent: boolean | null) => {
    setLocationConsentState(consent);
  };
  
  const setHasShownWelcomeModal = (hasShown: boolean) => {
    setHasShownWelcomeModalState(hasShown);
  };
  
  // Function to update all consent at once
  const updateAllConsent = (analytics: boolean, location: boolean) => {
    setAnalyticsConsentState(analytics);
    setLocationConsentState(location);
  };
  
  const contextValue = {
    analyticsConsent,
    locationConsent,
    hasShownWelcomeModal,
    
    setAnalyticsConsent,
    setLocationConsent,
    setHasShownWelcomeModal,
    updateAllConsent,
  };
  
  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
    </ConsentContext.Provider>
  );
};

export default ConsentProvider;