import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useMobile } from './MobileContext';

// Define drawer states as a type
type DrawerState = 'closed' | 'partial' | 'full';

interface TouchContextType {
  // Drawer state management
  drawerState: DrawerState;
  setDrawerState: (state: DrawerState) => void;
  
  // Touch handling utilities
  isMapBlocked: boolean;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isPartialDrawer: boolean; // Helper to check if drawer is in partial state
  
  // Scroll position tracking
  isContentAtTop: boolean;
  setContentScrollPosition: (isAtTop: boolean) => void;
  
  // Touch event handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  
  // Callback for clearing selection when drawer is closed via gestures
  setLocationClearCallback: (callback: () => void) => void;
}

const TouchContext = createContext<TouchContextType | undefined>(undefined);

interface TouchStateTracker {
  startY: number;
  currentY: number;
  velocity: number;
  isDragging: boolean;
  startTime: number;
  drawerHeight: number;
}

export const TouchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile } = useMobile();
  
  // Core state
  const [drawerState, setDrawerState] = useState<DrawerState>('closed');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isContentAtTop, setIsContentAtTop] = useState(true);
  
  // Callback reference for clearing selection when drawer is closed
  const clearLocationCallbackRef = useRef<(() => void) | null>(null);
  
  // Touch tracking refs
  const touchState = useRef<TouchStateTracker>({
    startY: 0,
    currentY: 0,
    velocity: 0,
    isDragging: false,
    startTime: 0,
    drawerHeight: 0
  });
  
  // Calculate if map should be blocked based on state
  const isMapBlocked = useMemo(() => {
    // On desktop, we don't need to block the map
    if (!isMobile) return false;
    
    // Always block when a modal is open
    if (isModalOpen) return true;
    
    // Block when drawer is in any state other than closed
    if (drawerState !== 'closed') return true;
    
    // If any of these special conditions apply, block the map
    // This ensures map doesn't interfere with critical user interactions
    if (touchState.current.isDragging) return true;
    
    return false;
  }, [isMobile, isModalOpen, drawerState]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    
    // Check if touch is on drawer or modal
    const isDrawerTouch = target.closest('.z-drawer-container');
    const isModalTouch = target.closest('.z-modal-container');
    
    if (!isDrawerTouch && !isModalTouch) return;
    
    // Check if touch is on pull handle - always allow pull handle interactions
    const isPullHandleTouch = target.closest('.z-drawer-pull-handle');
    
    // Get the proper drawer height based on current state
    const getDrawerHeight = () => {
      if (drawerState === 'full') {
        return window.innerHeight;
      } else if (drawerState === 'partial') {
        // Try to get the value from CSS variable, fallback to calculation
        const mobileMapArea = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--mobile-map-area') ||
          `${window.innerHeight - 84}`
        );
        return mobileMapArea * 0.5;
      }
      return window.innerHeight * 0.5; // Default fallback
    };
    
    // Initialize touch tracking
    touchState.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      velocity: 0,
      isDragging: false,
      startTime: Date.now(),
      drawerHeight: getDrawerHeight()
    };
    
    // In partial drawer state, prevent default for ALL touches to the drawer
    // This prevents scrolling content and ensures all swipes control drawer movement
    if (drawerState === 'partial' && isDrawerTouch) {
      e.preventDefault();
    }
    // For pull handle, always prevent default to ensure it works for drawer control
    else if (isPullHandleTouch) {
      e.preventDefault();
    }
    // For full drawer state, only prevent default if content is at top (allows scrolling otherwise)
    else if (drawerState === 'full' && isDrawerTouch && isContentAtTop) {
      // Only prevent when at the top of content
      e.preventDefault();
    }
  }, [isMobile, drawerState, isContentAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isModalOpen) return;
    
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const deltaY = touch.clientY - touchState.current.startY;
    
    // Check if touch is on drawer
    const isDrawerTouch = target.closest('.z-drawer-container');
    if (!isDrawerTouch) return;
    
    // Check if touch is on pull handle - always allow pull handle to drag
    const isPullHandleTouch = target.closest('.z-drawer-pull-handle');
    
    // Special case for full drawer state:
    // Only allow dragging when content is at top OR using pull handle
    if (drawerState === 'full') {
      // For pull handle, always allow dragging
      if (isPullHandleTouch && Math.abs(deltaY) > 2) {
        touchState.current.isDragging = true;
        e.preventDefault();
      }
      // For content area, only allow dragging when at top AND swiping down
      else if (isContentAtTop && deltaY > 0 && Math.abs(deltaY) > 5) {
        touchState.current.isDragging = true;
        e.preventDefault();
      }
      // All other cases in full drawer state - do not intercept to allow regular scrolling
    }
    // For partial drawer state: immediately start dragging with any vertical movement
    else if (drawerState === 'partial' && Math.abs(deltaY) > 2) {
      touchState.current.isDragging = true;
      // Prevent default to stop any scrolling within the drawer
      e.preventDefault();
    }
    // For other states or pull handle: start dragging after more significant movement
    else if (Math.abs(deltaY) > 5) {
      touchState.current.isDragging = true;
    }
    
    if (touchState.current.isDragging) {
      // Calculate velocity
      const deltaTime = Date.now() - touchState.current.startTime;
      touchState.current.velocity = deltaY / deltaTime;
      
      // Update current position
      touchState.current.currentY = touch.clientY;
      
      // Prevent default to stop scrolling while dragging
      e.preventDefault();
      
      // Update drawer transform based on drag
      const drawer = target.closest('.z-drawer-container') as HTMLElement;
      if (drawer) {
        drawer.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }, [isMobile, isModalOpen, drawerState, isContentAtTop]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchState.current.isDragging) return;
    
    const deltaY = touchState.current.currentY - touchState.current.startY;
    const velocity = touchState.current.velocity;
    const drawer = (e.target as HTMLElement).closest('.z-drawer-container') as HTMLElement;
    
    if (!drawer) return;
    
    // Reset transform
    drawer.style.transform = '';
    drawer.style.transition = 'transform 0.3s ease-out';
    
    // Determine new state based on current state, drag distance, and velocity
    const VELOCITY_THRESHOLD = 0.5; // pixels per millisecond
    const DISTANCE_THRESHOLD = touchState.current.drawerHeight * 0.2; // 20% of drawer height
    
    let newDrawerState = drawerState;
    
    if (drawerState === 'partial') {
      if (deltaY > DISTANCE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && deltaY > 0)) {
        newDrawerState = 'closed';
      } else if (deltaY < -DISTANCE_THRESHOLD || (velocity < -VELOCITY_THRESHOLD && deltaY < 0)) {
        newDrawerState = 'full';
      } else {
        newDrawerState = 'partial';
      }
    } else if (drawerState === 'full') {
      if (deltaY > DISTANCE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && deltaY > 0)) {
        newDrawerState = 'partial';
      } else {
        newDrawerState = 'full';
      }
    }
    
    // If we're closing the drawer with a gesture, invoke the callback to clear selection
    if (newDrawerState === 'closed' && drawerState !== 'closed' && clearLocationCallbackRef.current) {
      // Small delay to ensure the drawer transition starts first
      setTimeout(() => {
        clearLocationCallbackRef.current?.();
      }, 10);
      console.log('Drawer closed by gesture - clearing selection');
      clearLocationCallbackRef.current();
    }
    
    // Set the new drawer state
    setDrawerState(newDrawerState);
    
    // Reset touch tracking
    touchState.current.isDragging = false;
  }, [isMobile, drawerState]);

  // Effect to handle document-level touch events
  useEffect(() => {
    if (!isMobile) return;
    
    const handleDocumentTouch = (e: TouchEvent) => {
      // Prevent map interaction when drawer is open
      if (isMapBlocked && !(e.target as Element)?.closest('.z-drawer-container, .z-modal-container')) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', handleDocumentTouch, { passive: false });
    return () => document.removeEventListener('touchmove', handleDocumentTouch);
  }, [isMobile, isMapBlocked]);

  // Add a simple computed property to check if drawer is in partial state
  const isPartialDrawer = drawerState === 'partial';
  
  // Track if a drawer state change is from user interaction or programmatic
  const isProgrammaticChange = useRef(false);

  // Callback setter function
  const setLocationClearCallback = useCallback((callback: () => void) => {
    clearLocationCallbackRef.current = callback;
  }, []);
  
  // Scroll position tracking function
  const setContentScrollPosition = useCallback((isAtTop: boolean) => {
    setIsContentAtTop(isAtTop);
  }, []);
  
  // Wrapped version of setDrawerState that allows indicating programmatic changes
  const setDrawerStateWrapper = useCallback((state: DrawerState, isProgrammatic: boolean = false) => {
    isProgrammaticChange.current = isProgrammatic;
    setDrawerState(state);
    // Reset flag after a short delay to ensure it's available during state update effects
    setTimeout(() => {
      isProgrammaticChange.current = false;
    }, 50);
  }, [setDrawerState]);
  
  const contextValue = useMemo(() => ({
    drawerState,
    setDrawerState: setDrawerStateWrapper,
    isMapBlocked,
    isModalOpen,
    setModalOpen,
    isPartialDrawer,
    isContentAtTop,
    setContentScrollPosition,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setLocationClearCallback
  }), [
    drawerState,
    setDrawerStateWrapper,
    isMapBlocked,
    isModalOpen,
    setModalOpen,
    isPartialDrawer,
    isContentAtTop,
    setContentScrollPosition,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setLocationClearCallback
  ]);

  return (
    <TouchContext.Provider value={contextValue}>
      {children}
    </TouchContext.Provider>
  );
};

export const useTouch = (): TouchContextType => {
  const context = useContext(TouchContext);
  if (!context) {
    throw new Error('useTouch must be used within a TouchProvider');
  }
  return context;
};