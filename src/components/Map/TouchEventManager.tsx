import React, { useEffect, useRef } from 'react';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';

const TouchEventManager: React.FC = () => {
  const { isMobile } = useMobile();
  const { isDrawerOpen, isDrawerExpanded } = useUIState();
  
  // Create refs to track the current drawer states
  const drawerOpenRef = useRef(isDrawerOpen);
  const drawerExpandedRef = useRef(isDrawerExpanded);
  
  // Keep the refs updated with the latest drawer states
  useEffect(() => {
    drawerOpenRef.current = isDrawerOpen;
    drawerExpandedRef.current = isDrawerExpanded;
  }, [isDrawerOpen, isDrawerExpanded]);
  
  // Add a global touch event manager that will prevent map interactions
  // when the drawer is open on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    // This function prevents touch events from bubbling to the map
    // when the drawer is open but not in full-screen mode
    const handleTouchMove = (e: TouchEvent) => {
      // Get the current drawer states from the refs
      const isDrawerOpenNow = drawerOpenRef.current;
      const isDrawerExpandedNow = drawerExpandedRef.current;
      
      // Early exit if drawer is closed
      if (!isDrawerOpenNow) return;
      
      // Check if the touch target is within the drawer
      const target = e.target as Element;
      const isInDrawer = Boolean(target?.closest?.('.z-drawer-container'));
      const isPullHandle = Boolean(target?.closest?.('.z-drawer-pull-handle'));
      const isModalContent = Boolean(target?.closest?.('.z-modal-container'));
      
      // Allow events for modals to pass through normally
      if (isModalContent) return;
      
      // Special handling for pull handle - always prevent default and let its own handler work
      if (isPullHandle) {
        e.preventDefault();
        return;
      }
      
      // Different handling based on drawer state:
      // 1. If drawer is open but NOT expanded (half screen):
      //    - Prevent default for ALL touches to stop map interaction completely
      // 2. If drawer is expanded (full screen):
      //    - Allow normal scrolling inside the drawer
      //    - Prevent touches outside the drawer
      
      if (isDrawerOpenNow && !isDrawerExpandedNow) {
        // Partial drawer mode - block map touches completely
        // (MapBlockingOverlay will handle this more reliably, but this is a backup)
        if (!isInDrawer) {
          e.preventDefault();
        }
      } else if (isDrawerOpenNow && isDrawerExpandedNow) {
        // Full-screen drawer mode - only block outside touches
        if (!isInDrawer) {
          e.preventDefault();
        }
      }
    };
    
    // Handle touchstart - prevent map zoom gestures
    const handleTouchStart = (e: TouchEvent) => {
      const isDrawerOpenNow = drawerOpenRef.current;
      
      if (!isDrawerOpenNow) return;
      
      // Check if we need to prevent map interaction
      const target = e.target as Element;
      const isInDrawer = Boolean(target?.closest?.('.z-drawer-container'));
      const isModalContent = Boolean(target?.closest?.('.z-modal-container'));
      
      // Allow events for modals to pass through normally
      if (isModalContent) return;
      
      if (!isInDrawer) {
        // Prevent zoom gestures outside drawer when drawer is open
        e.preventDefault();
      }
    };
    
    // Also handle wheel events to prevent map zooming when drawer is open
    const handleWheel = (e: WheelEvent) => {
      const isDrawerOpenNow = drawerOpenRef.current;
      
      if (!isDrawerOpenNow) return;
      
      // Check if wheel is within the drawer
      const target = e.target as Element;
      const isInDrawer = Boolean(target?.closest?.('.z-drawer-container'));
      const isModalContent = Boolean(target?.closest?.('.z-modal-container'));
      
      // Allow wheel events for modals
      if (isModalContent) return;
      
      // Prevent wheel events outside the drawer
      if (!isInDrawer) {
        e.preventDefault();
      }
    };
    
    // Add the handlers with capture phase to intercept events early
    document.addEventListener('touchmove', handleTouchMove, {
      passive: false,
      capture: true
    });
    
    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
      capture: true
    });
    
    document.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true
    });
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove, {
        capture: true
      });
      
      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true
      });
      
      document.removeEventListener('wheel', handleWheel, {
        capture: true
      });
    };
  }, [isMobile]); // Only depend on isMobile since we use refs for state
  
  // This component doesn't render anything, it just manages touch events
  return null;
};

export default TouchEventManager;