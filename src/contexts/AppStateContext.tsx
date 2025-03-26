import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Define all possible app initialization states
export type InitializationState =
  | 'initial' // Initial app state before any loading
  | 'loading-locations' // Starting to fetch locations from Firebase
  | 'locations-loaded' // Raw locations data received from Firebase
  | 'locations-processed' // Locations data fully processed and ready for display
  | 'map-ready' // Google Map has initialized and is ready
  | 'drawer-initialized' // Drawer has been properly initialized
  | 'fully-ready'; // Everything is initialized and ready for user interaction

interface AppStateContextType {
  // App initialization state
  initState: InitializationState;
  isFullyInitialized: boolean;
  shouldOpenDrawer: boolean;

  // State transition methods
  setLocationsLoading: () => void;
  setLocationsLoaded: () => void;
  setLocationsProcessed: () => void;
  setMapReady: () => void;
  setDrawerInitialized: () => void;
  setFullyReady: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core initialization state - all components respond to this
  const [initState, setInitState] = useState<InitializationState>('initial');
  
  // Signal for when to open drawer - only set after locations are processed
  const [shouldOpenDrawer, setShouldOpenDrawer] = useState(false);
  
  // Debug logging of state transitions
  const logStateTransition = (newState: InitializationState) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 App initialization state: ${newState}`);
    }
  };
  
  // State transition methods
  const setLocationsLoading = useCallback(() => {
    setInitState(prev => {
      if (prev === 'initial') {
        logStateTransition('loading-locations');
        return 'loading-locations';
      }
      return prev; // Don't allow backward state transitions
    });
  }, []);
  
  const setLocationsLoaded = useCallback(() => {
    setInitState(prev => {
      if (prev === 'initial' || prev === 'loading-locations') {
        logStateTransition('locations-loaded');
        return 'locations-loaded';
      }
      return prev;
    });
  }, []);

  // New separate state for when locations are fully processed
  const setLocationsProcessed = useCallback(() => {
    setInitState(prev => {
      if (prev === 'initial' || prev === 'loading-locations' || prev === 'locations-loaded' || prev === 'map-ready') {
        logStateTransition('locations-processed');
        // Only NOW signal drawer to open (key timing fix)
        setShouldOpenDrawer(true);
        return 'locations-processed';
      }
      return prev;
    });
  }, []);
  
  const setMapReady = useCallback(() => {
    setInitState(prev => {
      // Map can be ready regardless of location loading state
      if (prev !== 'drawer-initialized' && prev !== 'fully-ready') {
        logStateTransition('map-ready');
        return 'map-ready';
      }
      return prev;
    });
  }, []);
  
  const setDrawerInitialized = useCallback(() => {
    setInitState(prev => {
      if (prev === 'locations-processed' || prev === 'map-ready' ||
          prev === 'locations-loaded') {
        logStateTransition('drawer-initialized');
        return 'drawer-initialized';
      }
      return prev;
    });
  }, []);
  
  const setFullyReady = useCallback(() => {
    setInitState(prev => {
      // Any state can transition to fully ready as a fallback
      logStateTransition('fully-ready');
      return 'fully-ready';
    });
  }, []);
  
  // Calculate if app is fully initialized based on state
  const isFullyInitialized = initState === 'fully-ready';
  
  // Create context value with memoization
  const contextValue = useMemo(() => ({
    initState,
    isFullyInitialized,
    shouldOpenDrawer,
    setLocationsLoading,
    setLocationsLoaded,
    setLocationsProcessed,
    setMapReady,
    setDrawerInitialized,
    setFullyReady
  }), [
    initState,
    isFullyInitialized,
    shouldOpenDrawer,
    setLocationsLoading,
    setLocationsLoaded,
    setLocationsProcessed,
    setMapReady,
    setDrawerInitialized,
    setFullyReady
  ]);
  
  // Initialize to loading locations on first mount
  React.useEffect(() => {
    if (initState === 'initial') {
      logStateTransition('initial');
      // Don't immediately transition to avoid too many state changes during initialization
    }
  }, [initState]);
  
  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};