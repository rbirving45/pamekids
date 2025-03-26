import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useMobile } from './MobileContext';

// Define all possible app states in our initialization sequence
type AppInitState =
  | 'initial'              // App just started
  | 'loading-locations'    // Fetching location data
  | 'locations-loaded'     // Location data ready
  | 'map-ready'            // Map initialized and ready
  | 'drawer-initialized'   // Drawer state set appropriately
  | 'fully-ready';         // Everything initialized and ready

interface AppStateContextType {
  // Core state
  initState: AppInitState;
  isFullyInitialized: boolean;
  
  // State setters (used by components to signal completion)
  setLocationsLoaded: () => void;
  setMapReady: () => void;
  setDrawerInitialized: () => void;
  
  // Coordination helpers
  shouldOpenDrawer: boolean;
  shouldShowMap: boolean;
  shouldLoadLocations: boolean;
}

// Create the context with undefined initial value
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// AppState Provider component
export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile } = useMobile();
  const [initState, setInitState] = useState<AppInitState>('initial');
  
  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 App initialization state: ${initState}`);
    }
  }, [initState]);
  
  // Define state transition functions
  const setLocationsLoaded = useCallback(() => {
    setInitState(prev => {
      if (prev === 'loading-locations') {
        return 'locations-loaded';
      }
      return prev; // Only transition from correct previous state
    });
  }, []);
  
  const setMapReady = useCallback(() => {
    setInitState(prev => {
      if (prev === 'locations-loaded') {
        return 'map-ready';
      }
      return prev; // Only transition from correct previous state
    });
  }, []);
  
  const setDrawerInitialized = useCallback(() => {
    setInitState(prev => {
      if (prev === 'map-ready') {
        return 'drawer-initialized';
      }
      return prev; // Only transition from correct previous state
    });
    
    // After drawer is initialized, complete the sequence to fully-ready
    setTimeout(() => {
      setInitState('fully-ready');
      if (process.env.NODE_ENV === 'development') {
        console.log('🎉 App fully initialized');
      }
    }, 50);
  }, []);
  
  // Start loading locations once we're out of initial state
  useEffect(() => {
    if (initState === 'initial') {
      setInitState('loading-locations');
    }
  }, [initState]);
  
  // Derived state based on current initialization state and device type
  const shouldOpenDrawer = useMemo(() => {
    // On mobile, we should open the drawer when map is ready
    // On desktop, we keep drawer closed until a location is selected
    if (isMobile) {
      return initState === 'map-ready' || initState === 'drawer-initialized' || initState === 'fully-ready';
    } else {
      // On desktop we don't automatically open the drawer during initialization
      // The map component will handle opening it when a location is selected
      return false;
    }
  }, [initState, isMobile]);
  
  const shouldShowMap = useMemo(() => {
    return initState === 'locations-loaded' || initState === 'map-ready' ||
           initState === 'drawer-initialized' || initState === 'fully-ready';
  }, [initState]);
  
  const shouldLoadLocations = useMemo(() => {
    return initState === 'loading-locations';
  }, [initState]);
  
  const isFullyInitialized = useMemo(() => {
    return initState === 'fully-ready';
  }, [initState]);
  
  // Context value with all state and functions
  const contextValue = useMemo(() => ({
    initState,
    isFullyInitialized,
    setLocationsLoaded,
    setMapReady,
    setDrawerInitialized,
    shouldOpenDrawer,
    shouldShowMap,
    shouldLoadLocations
  }), [
    initState,
    isFullyInitialized,
    setLocationsLoaded,
    setMapReady,
    setDrawerInitialized,
    shouldOpenDrawer,
    shouldShowMap,
    shouldLoadLocations
  ]);
  
  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the AppState context
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};