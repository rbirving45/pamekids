import React, { useEffect, useRef } from 'react';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';

const TouchEventManager: React.FC = () => {
  const { isMobile } = useMobile();
  const { isDrawerOpen } = useUIState();
  
  // Create a ref to track the current drawer state
  const drawerOpenRef = useRef(isDrawerOpen);
  
  // Keep the ref updated with the latest drawer state
  useEffect(() => {
    drawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);
  
  // Add a global touch event manager that will prevent map interactions
  // when the drawer is open on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    // This function prevents touch events from bubbling to the map
    // when the drawer is open
    const preventMapTouch = (e: TouchEvent) => {
      // Get the current drawer state from the ref
      const isDrawerOpenNow = drawerOpenRef.current;
      
      // Check if the touch target is within the drawer
      const target = e.target as Element;
      const isInDrawer = target?.closest?.('.z-drawer-container');
      
      // If it's not in the drawer and the drawer is open, prevent default
      // to stop the map from receiving the touch event
      if (!isInDrawer && isDrawerOpenNow) {
        e.preventDefault();
      }
    };
    
    // Add the handler with capture phase to intercept events early
    document.addEventListener('touchmove', preventMapTouch, {
      passive: false,
      capture: true
    });
    
    return () => {
      document.removeEventListener('touchmove', preventMapTouch, {
        capture: true
      });
    };
  }, [isMobile]); // Only depend on isMobile
  
  // This component doesn't render anything, it just manages touch events
  return null;
};

export default TouchEventManager;