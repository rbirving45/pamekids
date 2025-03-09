import React, { createContext, useContext, useState } from 'react';

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
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isDrawerExpanded, setDrawerExpanded] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  return (
    <UIStateContext.Provider
      value={{
        isDrawerOpen,
        setDrawerOpen,
        isDrawerExpanded,
        setDrawerExpanded,
        activeLocationId,
        setActiveLocationId
      }}
    >
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