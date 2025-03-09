import React, { useCallback } from 'react';
import { useUIState } from '../../contexts/UIStateContext';
import { useMobile } from '../../contexts/MobileContext';

const MapBlockingOverlay: React.FC = () => {
  const { isDrawerOpen, isDrawerExpanded } = useUIState();
  const { isMobile } = useMobile();
  
  // Enhanced handler for all touch/mouse events to prevent them from reaching the map
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Always stop propagation to prevent map interactions
    e.stopPropagation();
    
    // Prevent default behavior for all interactions to prevent map panning/zooming
    e.preventDefault();
  }, []);
  
  // Only show overlay when we're on mobile and drawer is open
  // Don't show when drawer is expanded to full screen as it's not needed
  if (!isMobile || !isDrawerOpen || isDrawerExpanded) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: 'transparent', // Invisible overlay
        pointerEvents: 'auto' // Crucial: This ensures the overlay captures all events
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      onTouchEnd={handleInteraction}
      onTouchCancel={handleInteraction}
      onMouseDown={handleInteraction}
      onMouseMove={handleInteraction}
      onMouseUp={handleInteraction}
      onWheel={handleInteraction} // Add wheel event to prevent zoom
      aria-hidden="true" // Accessibility: since this is just a blocking layer
    />
  );
};

export default MapBlockingOverlay;