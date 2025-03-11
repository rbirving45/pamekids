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
  
  // Touch event handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
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
    if (!isMobile) return false;
    if (isModalOpen) return true;
    return drawerState !== 'closed';
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
    
    // Prevent default only for drawer pull handle
    if (target.closest('.z-drawer-pull-handle')) {
      e.preventDefault();
    }
  }, [isMobile, drawerState]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isModalOpen) return;
    
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const deltaY = touch.clientY - touchState.current.startY;
    
    // Check if this is a drawer touch
    const isDrawerTouch = target.closest('.z-drawer-container');
    if (!isDrawerTouch) return;
    
    // Start tracking drag after slight movement
    if (Math.abs(deltaY) > 5) {
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
  }, [isMobile, isModalOpen]);

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
    
    if (drawerState === 'partial') {
      if (deltaY > DISTANCE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && deltaY > 0)) {
        setDrawerState('closed');
      } else if (deltaY < -DISTANCE_THRESHOLD || (velocity < -VELOCITY_THRESHOLD && deltaY < 0)) {
        setDrawerState('full');
      } else {
        setDrawerState('partial');
      }
    } else if (drawerState === 'full') {
      if (deltaY > DISTANCE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && deltaY > 0)) {
        setDrawerState('partial');
      } else {
        setDrawerState('full');
      }
    }
    
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

  const contextValue = useMemo(() => ({
    drawerState,
    setDrawerState,
    isMapBlocked,
    isModalOpen,
    setModalOpen,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }), [
    drawerState,
    setDrawerState,
    isMapBlocked,
    isModalOpen,
    setModalOpen,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
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