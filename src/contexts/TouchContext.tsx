import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useMobile } from './MobileContext';
import { useAppState } from './AppStateContext';

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
  isFilterDropdownOpen: boolean; // Track filter dropdown state
  setFilterDropdownOpen: (open: boolean) => void; // Set filter dropdown state
  isPartialDrawer: boolean; // Helper to check if drawer is in partial state
  isAllInteractionsBlocked: boolean; // Helper to check if all interactions should be blocked
  
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
  const { shouldOpenDrawer, setDrawerInitialized } = useAppState();
  
  // Always initialize drawer as closed - will be opened based on app state signals
  const initialDrawerState: DrawerState = 'closed';
  
  // Debug log for initialization (development mode only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`TouchContext initializing with drawer state: ${initialDrawerState} (deferring to AppStateContext)`);
  }
  
  // Core state
  const [drawerState, setDrawerState] = useState<DrawerState>(initialDrawerState);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isFilterDropdownOpen, setFilterDropdownOpen] = useState(false); // New state for filter dropdowns
  const [isContentAtTop, setIsContentAtTop] = useState(true);
  
  // Callback reference for clearing selection when drawer is closed
  const clearLocationCallbackRef = useRef<(() => void) | null>(null);
  
  // Add refs needed for tracking initialization state
  const initialAutoOpenCompletedRef = useRef<boolean>(false);
  const isProgrammaticChange = useRef(false);
  
  // Touch tracking refs
  const touchState = useRef<TouchStateTracker>({
    startY: 0,
    currentY: 0,
    velocity: 0,
    isDragging: false,
    startTime: 0,
    drawerHeight: 0
  });
  
  // Add a simple computed property to check if drawer is in partial state
  const isPartialDrawer = drawerState === 'partial';
  
  // Calculate if map should be blocked based on state
  const isMapBlocked = useMemo(() => {
    // On desktop, we don't need to block the map
    if (!isMobile) return false;
    
    // Always block when a modal is open - highest priority condition
    if (isModalOpen) return true;
    
    // Block when drawer is in any state other than closed
    if (drawerState !== 'closed') return true;
    
    // Block when filter dropdowns are open
    if (isFilterDropdownOpen) return true;
    
    // If any of these special conditions apply, block the map
    // This ensures map doesn't interfere with critical user interactions
    if (touchState.current.isDragging) return true;
    
    return false;
  }, [isMobile, isModalOpen, drawerState, isFilterDropdownOpen]);

  // Add a more specific check for completely blocking all interactions
  const isAllInteractionsBlocked = useMemo(() => {
    // When a modal is open, block ALL interactions
    return isModalOpen;
  }, [isModalOpen]);

  // This block is now redundant since we have isAllInteractionsBlocked defined below
  // (This block will be removed, as it's causing the duplicate variable)

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // If a modal is open, block ALL non-modal touch events immediately
    // This is the most critical part for preventing background interaction
    if (isModalOpen) {
      // Only allow interaction with modal container elements
      if (!(e.target as HTMLElement).closest('.z-modal-container')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Even for modal container elements, stop propagation to prevent
      // touch events from reaching underlying elements
      e.stopPropagation();
      return;
    }
    
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    
    // Check if touch is on drawer or modal
    const isDrawerTouch = target.closest('.z-drawer-container');
    const isModalTouch = target.closest('.z-modal-container');
    
    if (!isDrawerTouch && !isModalTouch) return;
    
    // Additional checks for specific elements
    const isPullHandleTouch = target.closest('.z-drawer-pull-handle');
    const isScrollableContent = target.closest('.drawer-block-map');
    const isTextElement = target.closest('.touchable-text') ||
                          target.tagName === 'P' ||
                          target.tagName === 'SPAN' ||
                          target.tagName === 'H1' ||
                          target.tagName === 'H2' ||
                          target.tagName === 'H3' ||
                          target.tagName === 'DIV';
    
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
    
    // Decision logic for touch handling:
    
    // 1. For partial drawer state - always control drawer, not content
    if (drawerState === 'partial' && isDrawerTouch) {
      e.preventDefault();
    }
    // 2. Pull handle always controls drawer
    else if (isPullHandleTouch) {
      e.preventDefault();
    }
    // 3. For full drawer state, handle differently based on context:
    else if (drawerState === 'full' && isDrawerTouch) {
      // Only control drawer if at top of content
      if (isContentAtTop) {
        e.preventDefault();
      }
      // When touching text in full drawer, prioritize scrolling
      else if (isTextElement && isScrollableContent && !isPullHandleTouch) {
        // Don't prevent default - allow natural scrolling
        touchState.current.isDragging = false;
      }
    }
  }, [isMobile, isModalOpen, drawerState, isContentAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // If modal is open, aggressively block all non-modal touch moves
    if (isModalOpen) {
      // Only let modal content scroll
      if (!(e.target as HTMLElement).closest('.z-modal-container')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Even for modal content, stop propagation to prevent events from reaching background
      e.stopPropagation();
      
      // For modal content, still allow natural scrolling - don't preventDefault here
      return;
    }
    
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const deltaY = touch.clientY - touchState.current.startY;
    
    // Check if touch is on drawer
    const isDrawerTouch = target.closest('.z-drawer-container');
    if (!isDrawerTouch) return;
    
    // Additional element checks
    const isPullHandleTouch = target.closest('.z-drawer-pull-handle');
    const isScrollableContent = target.closest('.drawer-block-map');
    const isTextElement = target.closest('.touchable-text') ||
                          target.tagName === 'P' ||
                          target.tagName === 'SPAN' ||
                          target.tagName === 'H1' ||
                          target.tagName === 'H2' ||
                          target.tagName === 'H3' ||
                          target.tagName === 'DIV';
    
    // Determine if this should be a drawer drag or content scroll
    let shouldAllowDrag = false;
    
    // Decision logic for dragging
    if (drawerState === 'full') {
      // 1. Always allow pull handle to drag
      if (isPullHandleTouch && Math.abs(deltaY) > 2) {
        shouldAllowDrag = true;
      }
      // 2. For content area in full drawer state:
      else if (isScrollableContent) {
        // 2a. If we're at the top AND swiping down, control the drawer
        if (isContentAtTop && deltaY > 5) {
          shouldAllowDrag = true;
        }
        // 2b. If touching text and not at the top, prioritize scrolling
        else if (isTextElement && !isContentAtTop) {
          shouldAllowDrag = false;
          // Reset dragging state to ensure scrolling works
          touchState.current.isDragging = false;
          return; // Exit early to allow natural scroll
        }
      }
    }
    // For partial drawer state: ALWAYS control drawer movement
    else if (drawerState === 'partial') {
      // In partial state, ANY touch on the drawer should control drawer movement
      shouldAllowDrag = true;
      // Always prevent default in partial state to block any scrolling
      e.preventDefault();
    }
    
    // Start dragging if conditions are met
    if (shouldAllowDrag || (Math.abs(deltaY) > 8 && !isTextElement)) {
      touchState.current.isDragging = true;
    }
    
    // Handle drawer movement if we're dragging
    if (touchState.current.isDragging) {
      // Calculate velocity
      const deltaTime = Date.now() - touchState.current.startTime;
      touchState.current.velocity = deltaY / (deltaTime || 1); // Avoid division by zero
      
      // Update current position
      touchState.current.currentY = touch.clientY;
      
      // Prevent default to stop scrolling while dragging
      e.preventDefault();
      
      // Apply resistance when dragging down in full state or up in partial state
      let adjustedDeltaY = deltaY;
      if ((drawerState === 'full' && deltaY > 0) ||
          (drawerState === 'partial' && deltaY < 0)) {
        adjustedDeltaY = deltaY * 0.5; // Add resistance
      }
      
      // Update drawer transform based on drag
      const drawer = target.closest('.z-drawer-container') as HTMLElement;
      if (drawer) {
        drawer.style.transform = `translateY(${adjustedDeltaY}px)`;
      }
    }
  }, [isMobile, isModalOpen, drawerState, isContentAtTop]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // If not dragging, this was probably a tap or scroll - just clean up
    if (!touchState.current.isDragging) {
      // Reset touch tracking to clean state
      touchState.current.isDragging = false;
      return;
    }
    
    const deltaY = touchState.current.currentY - touchState.current.startY;
    const velocity = touchState.current.velocity;
    const drawer = (e.target as HTMLElement).closest('.z-drawer-container') as HTMLElement;
    
    if (!drawer) return;
    
    // Reset transform with smooth transition
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
    
    // Detect if we're changing states or staying in the same state
    const isStateChanging = newDrawerState !== drawerState;
    
    // If we're closing the drawer with a gesture, invoke the callback to clear selection
    if (newDrawerState === 'closed' && drawerState !== 'closed' && clearLocationCallbackRef.current) {
      // Small delay to ensure the drawer transition starts first
      setTimeout(() => {
        clearLocationCallbackRef.current?.();
      }, 10);
      console.log('Drawer closed by gesture - clearing selection');
      clearLocationCallbackRef.current();
      
      // Mark that we've handled a user closing gesture
      // This doesn't affect the initial auto-open which has already happened
      // It just confirms that subsequent touch gestures work normally
      if (process.env.NODE_ENV === 'development') {
        console.log('User has manually closed the drawer - normal touch behavior');
      }
    }
    
    // Set the new drawer state
    setDrawerState(newDrawerState);
    
    // Reset touch tracking
    touchState.current.isDragging = false;
    
    // Add a small delay after state transitions to ensure proper handling of subsequent touches
    if (isStateChanging) {
      // This helps resolve issues where scrolling doesn't work immediately after a transition
      setTimeout(() => {
        // Re-enable scrolling after transition completes
        const scrollableContent = document.querySelector('.drawer-block-map');
        if (scrollableContent && newDrawerState === 'full') {
          (scrollableContent as HTMLElement).style.overflowY = 'auto';
          console.log('Re-enabled scrolling after transition');
        }
      }, 350); // Slightly longer than the transition duration (300ms)
    }
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
  
  // Effect to control drawer state based on AppStateContext
  useEffect(() => {
    // Only act when shouldOpenDrawer changes to true
    if (shouldOpenDrawer) {
      // Check if we've already done the initial auto-open
      if (initialAutoOpenCompletedRef.current) {
        // We've already opened the drawer once, don't auto-open again
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 TouchContext: Skipping auto-open, already completed initial open');
        }
        
        // Still signal initialization to keep AppStateContext happy
        setDrawerInitialized();
        return;
      }
      
      // Only open drawer on mobile - desktop drawer starts closed until location selected
      if (isMobile) {
        if (drawerState === 'closed') {
          if (process.env.NODE_ENV === 'development') {
            console.log('📱 TouchContext: Opening drawer based on AppStateContext signal');
          }
          
          // Ensure we're not in the middle of a touch drag operation
          if (!touchState.current.isDragging) {
            // Open the drawer
            setDrawerState('partial');
            
            // Mark that we've completed the initial auto-open
            initialAutoOpenCompletedRef.current = true;
            
            // Signal that drawer has been initialized
            // This should happen after drawer state is updated
            setTimeout(() => {
              setDrawerInitialized();
            }, 50);
          } else {
            // If somehow we're in the middle of a drag, wait for it to finish
            console.log('Delaying drawer open due to active touch operation');
            setTimeout(() => {
              if (drawerState === 'closed') {
                setDrawerState('partial');
                initialAutoOpenCompletedRef.current = true;
                setDrawerInitialized();
              }
            }, 300);
          }
        } else {
          // Drawer is already open, just signal initialization and mark as completed
          initialAutoOpenCompletedRef.current = true;
          setDrawerInitialized();
        }
      } else {
        // On desktop, still signal initialization even though drawer doesn't open
        initialAutoOpenCompletedRef.current = true;
        setDrawerInitialized();
      }
    }
  }, [shouldOpenDrawer, isMobile, drawerState, setDrawerState, setDrawerInitialized]);

  // We don't need the drawerInitializedRef - it was causing the "unused variable" warning
  // The other refs are now defined earlier in the file

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
    isFilterDropdownOpen,
    setFilterDropdownOpen,
    isPartialDrawer,
    isContentAtTop,
    setContentScrollPosition,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setLocationClearCallback,
    isAllInteractionsBlocked
  }), [
    drawerState, // isPartialDrawer is derived from drawerState, so we don't need it in deps
    isPartialDrawer,
    setDrawerStateWrapper,
    isMapBlocked,
    isModalOpen,
    setModalOpen,
    isFilterDropdownOpen,
    setFilterDropdownOpen,
    isContentAtTop,
    setContentScrollPosition,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setLocationClearCallback,
    isAllInteractionsBlocked
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