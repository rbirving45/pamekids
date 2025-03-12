import React from 'react';
import { useTouch } from '../../contexts/TouchContext';

/**
 * MapBlockingOverlay - A simple invisible overlay that prevents map interaction
 * by capturing and stopping all events from reaching the map.
 *
 * This works alongside the gestureHandling='none' option as a second layer
 * of protection against unwanted map interactions.
 */
const MapBlockingOverlay: React.FC = () => {
  const { isMapBlocked } = useTouch();
  
  // Don't render anything if map shouldn't be blocked
  if (!isMapBlocked) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: 'transparent',
        pointerEvents: 'auto',
        opacity: 0, // Ensure overlay is invisible
        touchAction: 'none' // Prevent all browser touch actions
      }}
      // Use passive: false to ensure preventDefault works
      onTouchStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      aria-hidden="true"
    />
  );
};

export default MapBlockingOverlay;