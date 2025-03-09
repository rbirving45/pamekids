import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

interface UIStateContextType {
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isDrawerExpanded: boolean;
  setDrawerExpanded: (expanded: boolean) => void;
  activeLocationId: string | null;
  setActiveLocationId: (id: string | null) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const UIStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpenState] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpandedState] = useState(false);
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(null);

  // Use refs to track previous state values for debugging if needed
  const prevDrawerOpenRef = useRef(isDrawerOpen);
  const prevDrawerExpandedRef = useRef(isDrawerExpanded);
  const prevActiveLocationIdRef = useRef(activeLocationId);

  // Update the refs when state changes
  React.useEffect(() => {
    prevDrawerOpenRef.current = isDrawerOpen;
    prevDrawerExpandedRef.current = isDrawerExpanded;
    prevActiveLocationIdRef.current = activeLocationId;
  }, [isDrawerOpen, isDrawerExpanded, activeLocationId]);

  // Memoize callback functions to prevent unnecessary re-renders
  const setDrawerOpen = useCallback((open: boolean) => {
    setIsDrawerOpenState(open);
  }, []);
  
  const setDrawerExpanded = useCallback((expanded: boolean) => {
    setIsDrawerExpandedState(expanded);
  }, []);
  
  const setActiveLocationId = useCallback((id: string | null) => {
    setActiveLocationIdState(id);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isDrawerOpen,
    setDrawerOpen,
    isDrawerExpanded,
    setDrawerExpanded,
    activeLocationId,
    setActiveLocationId
  }), [
    isDrawerOpen,
    setDrawerOpen,
    isDrawerExpanded,
    setDrawerExpanded,
    activeLocationId,
    setActiveLocationId
  ]);

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = (): UIStateContextType => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};