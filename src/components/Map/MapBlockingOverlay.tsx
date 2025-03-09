import React from 'react';
import { useUIState } from '../../contexts/UIStateContext';
import { useMobile } from '../../contexts/MobileContext';

const MapBlockingOverlay: React.FC = () => {
  const { isDrawerOpen } = useUIState();
  const { isMobile } = useMobile();
  
  // Only show on mobile and when drawer is open
  if (!isMobile || !isDrawerOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: 'transparent', // Invisible overlay
        pointerEvents: 'auto' // But it blocks events
      }}
      onClick={(e) => {
        // Prevent clicks from reaching the map
        e.stopPropagation();
      }}
    />
  );
};

export default MapBlockingOverlay;