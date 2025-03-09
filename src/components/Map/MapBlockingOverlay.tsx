import React, { useCallback } from 'react';
import { useUIState } from '../../contexts/UIStateContext';
import { useMobile } from '../../contexts/MobileContext';

const MapBlockingOverlay: React.FC = () => {
  const { isDrawerOpen } = useUIState();
  const { isMobile } = useMobile();
  
  // Handle touch/mouse events to prevent them from reaching the map
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Stop propagation to prevent map interactions
    e.stopPropagation();
    
    // For touch events, prevent default behavior (map panning, etc.)
    if ('touches' in e) {
      e.preventDefault();
    }
  }, []);
  
  // Only show on mobile and when drawer is open
  if (!isMobile || !isDrawerOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: 'transparent', // Invisible overlay
        pointerEvents: 'auto' // But it blocks events
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      onTouchEnd={handleInteraction}
      aria-hidden="true" // Since this is just a blocking layer
    />
  );
};

export default MapBlockingOverlay;