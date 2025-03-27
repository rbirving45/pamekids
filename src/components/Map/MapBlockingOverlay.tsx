import React, { useEffect } from 'react';
import { useTouch } from '../../contexts/TouchContext';
import { useMobile } from '../../contexts/MobileContext';

/**
 * MapBlockingOverlay - A simple invisible overlay that prevents map interaction
 * by capturing and stopping all events from reaching the map.
 *
 * This works alongside the gestureHandling='none' option as a second layer
 * of protection against unwanted map interactions.
 *
 * The overlay now handles block scenarios:
 * 1. When drawer is open
 * 2. When modal is open
 * 3. When filter dropdowns are open
 * 4. When touch drag operations are in progress
 */
const MapBlockingOverlay: React.FC = () => {
  const { isMapBlocked, isFilterDropdownOpen, drawerState, isModalOpen } = useTouch();
  const { isMobile } = useMobile();
  
  // Debug logging in development mode only
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMapBlocked) {
      const blockReasons = [];
      if (isModalOpen) blockReasons.push('modal open');
      if (isFilterDropdownOpen) blockReasons.push('filter dropdown open');
      if (drawerState !== 'closed') blockReasons.push(`drawer state: ${drawerState}`);
      
      console.log(`🚫 Map interactions blocked: ${blockReasons.join(', ')}`);
    }
  }, [isMapBlocked, isFilterDropdownOpen, drawerState, isModalOpen]);
  
  // Don't render anything if map shouldn't be blocked
  if (!isMapBlocked) return null;
  
  // Don't render on desktop unless specifically needed
  if (!isMobile && !isModalOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: process.env.NODE_ENV === 'development' ? 'rgba(255,0,0,0.05)' : 'transparent', // Slightly visible in dev mode
        pointerEvents: 'auto',
        opacity: process.env.NODE_ENV === 'development' ? 0.05 : 0, // Slightly visible in dev mode
        touchAction: 'none', // Prevent all browser touch actions
        userSelect: 'none', // Prevent text selection
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        cursor: 'default',
        zIndex: 'var(--z-map-blocker)' // Use the CSS variable for z-index
      }}
      // Use passive: false to ensure preventDefault works
      onTouchStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (process.env.NODE_ENV === 'development') {
          console.log('⛔ MapBlockingOverlay intercepted touchStart event');
        }
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (process.env.NODE_ENV === 'development') {
          console.log('⛔ MapBlockingOverlay intercepted touchMove event');
        }
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (process.env.NODE_ENV === 'development') {
          console.log('⛔ MapBlockingOverlay intercepted touchEnd event');
        }
      }}
      onClick={(e) => {
        // Also block mouse clicks from reaching the map
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        // Block mouse events too
        e.stopPropagation();
        e.preventDefault();
      }}
      aria-hidden="true"
      data-testid="map-blocking-overlay"
    />
  );
};

export default MapBlockingOverlay;