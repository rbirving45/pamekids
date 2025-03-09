import React, { useEffect } from 'react';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';

const TouchEventManager: React.FC = () => {
  const { isMobile } = useMobile();
  const { isDrawerOpen } = useUIState();
  
  // Add a global touch event manager that will prevent map interactions
  // when the drawer is open on mobile
  useEffect(() => {
    if (!isMobile || !isDrawerOpen) return;
    
    // This function prevents touch events from bubbling to the map
    // when the drawer is open
    const preventMapTouch = (e: TouchEvent) => {
      // Check if the touch target is within the drawer
      const isInDrawer = (e.target as Element)?.closest('.z-drawer-container');
      
      // If it's not in the drawer and the drawer is open, prevent default
      // to stop the map from receiving the touch event
      if (!isInDrawer && isDrawerOpen) {
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
  }, [isMobile, isDrawerOpen]);
  
  // This component doesn't render anything, it just manages touch events
  return null;
};

export default TouchEventManager;