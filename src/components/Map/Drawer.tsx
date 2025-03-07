import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import ImageCarousel from './ImageCarousel';
import { Location, ActivityType } from '../../data/locations';
import { addUtmParams, trackExternalLink } from '../../utils/analytics';
import { X, Phone, Globe, MapPin, ChevronLeft } from 'lucide-react';
import { fetchPlaceDetails } from '../../utils/places-api';
import RatingDisplay from './RatingDisplay';
import ReportIssueModal from '../ReportIssue/ReportIssueModal';
import LocationTile from './LocationTile';

interface DrawerProps {
  location: Location | null;
  onClose: () => void;
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  visibleLocations?: Location[];
  onLocationSelect?: (location: Location) => void;
  activeFilters?: ActivityType[];
  selectedAge?: number | null;
  openNowFilter?: boolean;
  mobileDrawerOpen?: boolean; // Add this prop to control mobile drawer state
  backToList?: () => void; // Add this prop to handle back to list navigation
}

// Using memo to prevent unnecessary re-renders when props don't change
const Drawer: React.FC<DrawerProps> = memo(({
  location,
  onClose,
  activityConfig,
  visibleLocations = [],
  onLocationSelect,
  activeFilters = [],
  selectedAge = null,
  openNowFilter = false,
  mobileDrawerOpen = true,
  backToList
}) => {
  // Store location ID to prevent unnecessary effect triggers
  const locationId = location?.id;
  
  const [placeData, setPlaceData] = useState<Location['placeData']>();
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fetchTimestamp, setFetchTimestamp] = useState(0);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  
  // Mobile drawer state - check localStorage for previous expanded state
  const isMobile = useRef(window.matchMedia('(max-width: 767px)').matches);
  const [mobileMode, setMobileMode] = useState<'list' | 'detail'>('list');
  
  // Initialize expanded state to false (half-screen) on mobile for list view
  // But keep expanded state for location detail view if coming from expanded list
  const [isExpanded, setIsExpanded] = useState(false);
  
  const drawerRef = useRef<HTMLDivElement>(null);
  const pullHandleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const isScrolling = useRef<boolean>(false);
  
  // Determine which view to show on mobile
  useEffect(() => {
    if (isMobile.current) {
      if (location) {
        setMobileMode('detail');
        // Don't reset the expanded state when transitioning from list to detail
        // This allows the detail view to inherit the expanded state from the list view
      } else {
        setMobileMode('list');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
  
  // Return early if mobile drawer should be closed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isMobile.current && (!mobileDrawerOpen && !location)) {
      // Reset any transform and animation when drawer is closed
      if (drawerRef.current) {
        drawerRef.current.style.transform = '';
        drawerRef.current.style.transition = 'transform 0.3s ease-out';
      }
    }
  }, [mobileDrawerOpen, location]);
  
  // Clear state when location changes
  useEffect(() => {
    setPlaceData(undefined);
    setIsLoading(false);
    setHasAttemptedFetch(false);
    setFetchTimestamp(Date.now()); // Use timestamp to force new photo loading
    
    // Preserve expanded state when location changes on mobile
    // We want to remember if the user had the drawer expanded
    
    // Reset any active drag when location changes
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = 'transform 0.3s ease-out';
    }
    isDragging.current = false;
    isScrolling.current = false;
  }, [locationId]);

  // Your existing fetchData function
  const fetchData = useCallback(async () => {
    // Existing implementation...
    if (!locationId || !window.google?.maps) return;
    
    setIsLoading(true);
    
    try {
      const data = await fetchPlaceDetails(locationId, window.google.maps);
      
      if (data) {
        if (location?.placeData) {
          const mergedData = {
            ...location.placeData,
            ...data,
            photos: [...(data.photos || []), ...(location.placeData.photos || [])].filter(
              (photo, index, self) =>
                photo &&
                typeof photo.getUrl === 'function' &&
                self.findIndex(p => p === photo) === index
            ),
            photoUrls: data.photoUrls?.length ? data.photoUrls : location.placeData.photoUrls,
            rating: data.rating || location.placeData.rating,
            userRatingsTotal: data.userRatingsTotal || location.placeData.userRatingsTotal
          };
          
          setPlaceData(mergedData);
          location.placeData = mergedData;
        } else {
          setPlaceData(data);
          
          if (location) {
            location.placeData = data;
          }
        }
      }
    } catch (error) {
      if (location?.placeData) {
        setPlaceData(location.placeData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [locationId, location]);

  // Fetch data immediately when a location is selected
  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId, fetchData]);

  // Mobile overflow handling
  useEffect(() => {
    // eslint-disable-next-line no-mixed-operators
    if (isMobile.current && ((location || (mobileDrawerOpen && visibleLocations.length > 0)))) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [location, visibleLocations, mobileDrawerOpen]);

  // Handle wheel events for scrolling
  useEffect(() => {
    if (!isMobile.current || (!location && mobileMode !== 'list' && !mobileDrawerOpen) || !drawerRef.current) return;
    
    const content = contentRef.current;
    
    if (!content) return;
    
    const handleWheel = (e: WheelEvent) => {
      // On mobile in half-screen: expand on any scroll attempt
      if (isMobile.current && !isExpanded) {
        setIsExpanded(true);
        e.preventDefault(); // Prevent actual scrolling during expansion
        return;
      }
      
      // On desktop: only intercept wheel events if they would expand the drawer and we're at the top
      if (!isMobile.current && !isExpanded && e.deltaY > 0 && content.scrollTop <= 0) {
        setIsExpanded(true);
        e.preventDefault(); // Prevent actual scrolling during expansion
      }
    };
    
    // Attach to content area, not the entire drawer
    content.addEventListener('wheel', handleWheel, { passive: false });
    return () => content.removeEventListener('wheel', handleWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isExpanded, mobileMode, mobileDrawerOpen]);
  
  // Add effect to ensure drawer gets proper pointer events after rendering
  useEffect(() => {
    if (location || (isMobile.current && mobileMode === 'list')) {
      // Small delay to let the drawer positioning settle before enabling interactions
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.style.pointerEvents = 'auto';
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [location, mobileMode]);

  // Handle drawer close action for different states
  const handleCloseAction = () => {
    // Always close the drawer completely on mobile
    // On desktop, maintain the original behavior
    onClose();
  };

  // Add unified touch event handling for the drawer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isMobile.current || (!location && mobileMode !== 'list' && !mobileDrawerOpen) || !drawerRef.current) return;
    
    const drawer = drawerRef.current;
    const handle = pullHandleRef.current;
    const header = headerRef.current;
    const content = contentRef.current;
    
    if (!handle || !header || !content) return;
    
    // Track if we should intercept touch events
    let shouldHandleDrag = false;
    let initialTouchY = 0;
    let initialScrollTop = 0;
    
    // Handle touch start events
    const handleTouchStart = (e: TouchEvent) => {
      // Store initial touch position
      initialTouchY = e.touches[0].clientY;
      dragStartY.current = initialTouchY;
      lastTouchY.current = initialTouchY;
      touchStartTime.current = Date.now();
      
      // Store scroll position to determine if we're at the top
      initialScrollTop = content.scrollTop;
      
      // Determine if we should handle this touch as a drawer drag
      // eslint-disable-next-line no-mixed-operators
      if (e.target === handle || (!isMobile.current || !isExpanded) && header && header.contains(e.target as Node)) {
        // Always handle drag for pull handle or header (when not expanded)
        shouldHandleDrag = true;
        drawer.style.transition = 'none';
      } else if (content.contains(e.target as Node)) {
        // For expanded view, we'll handle drag if we're at the top OR if it's a significant downward swipe
        shouldHandleDrag = false; // We'll decide this in touchmove
        
        // If we're expanded and at the top, prepare for potential drag
        if (isExpanded && initialScrollTop <= 0) {
          shouldHandleDrag = true;
          drawer.style.transition = 'none';
        }
      }
      
      // Reset tracking
      isDragging.current = false;
      isScrolling.current = false;
    };
    
    // Handle touch move events
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - initialTouchY;
      const isScrollingDown = currentY > lastTouchY.current!;
      const moveDistance = Math.abs(deltaY);
      const timeDelta = Date.now() - touchStartTime.current;
      const velocity = moveDistance / timeDelta;
      
      // Update last touch position for next move event
      lastTouchY.current = currentY;
      
      // For content area, decide if this is a scroll or drawer drag
      if (!isDragging.current && !isScrolling.current && content.contains(e.target as Node)) {
        // Enhanced drag detection for expanded mode
        if (isMobile.current && isExpanded) {
          const isSignificantDownwardSwipe = isScrollingDown && (velocity > 0.3 || moveDistance > 30);
          
          if ((initialScrollTop <= 1 && isScrollingDown) || isSignificantDownwardSwipe) {
            // Allow dragging for top-edge pulls or significant downward swipes
            isDragging.current = true;
            drawer.style.transition = 'none';
            shouldHandleDrag = true;
            // Prevent scroll when we're taking over with drag
            e.preventDefault();
          } else if (!isSignificantDownwardSwipe && !shouldHandleDrag) {
            // Normal content scroll
            isScrolling.current = true;
            return;
          }
        }
        // Normal half-screen behavior
        else if (initialScrollTop <= 1 && isScrollingDown) {
          isDragging.current = true;
          drawer.style.transition = 'none';
          shouldHandleDrag = true;
        } else {
          // Regular content scroll
          isScrolling.current = true;
          return;
        }
      }
      
      // If this is a header/handle drag or a content drag that we decided to handle
      if (shouldHandleDrag || isDragging.current) {
        // Calculate how much to move the drawer
        let moveY;
        if (deltaY > 0) { // Dragging downward
          const resistance = isExpanded ? 0.5 : 0.3;
          moveY = deltaY * resistance;
        } else { // Dragging upward
          const resistance = isExpanded ? 0.8 : 0.5;
          moveY = deltaY * resistance;
        }
        
        // Move the drawer
        drawer.style.transform = `translateY(${moveY}px)`;
        
        // Prevent default ONLY if we're actually dragging the drawer
        e.preventDefault();
        isDragging.current = true;
      }
    };
    
    // Handle touch end events
    const handleTouchEnd = (e: TouchEvent) => {
      // Skip if we weren't dragging
      if (!isDragging.current && !shouldHandleDrag) {
        return;
      }
      
      // Re-enable transition for smooth animation
      drawer.style.transition = 'transform 0.3s ease-out';
      
      // Calculate swipe metrics
      if (dragStartY.current !== null && lastTouchY.current !== null) {
        const totalDeltaY = lastTouchY.current - dragStartY.current;
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime.current;
        const swipeVelocity = Math.abs(totalDeltaY) / touchDuration;
        
        // Enhanced drawer logic with better velocity/distance thresholds
        if (isExpanded) {
          // Currently expanded
          if (totalDeltaY > 0) { // Downward swipe
            if (swipeVelocity > 0.7 || totalDeltaY > 150) {
              // Fast or long downward swipe - collapse to half state
              setIsExpanded(false);
            } else if (swipeVelocity > 1.2 || totalDeltaY > 300) {
              // Very fast or very long swipe - close completely
              handleCloseAction();
            } else if (totalDeltaY > 60) {
              // Moderate swipe - collapse to half state
              setIsExpanded(false);
            } else {
              // Small movement - stay expanded
              drawer.style.transform = '';
            }
          } else {
            // Upward swipe while expanded - reset position
            drawer.style.transform = '';
          }
        } else {
          // Currently in half state
          if (totalDeltaY < 0 && (swipeVelocity > 0.5 || totalDeltaY < -50)) {
            // Upward swipe - expand
            setIsExpanded(true);
          } else if (totalDeltaY > 0 && (swipeVelocity > 0.5 || totalDeltaY > 80)) {
            // Downward swipe - close completely
            handleCloseAction();
          } else {
            // Not enough movement - stay in half state
            drawer.style.transform = '';
          }
        }
      }
      
      // Reset all tracking variables
      isDragging.current = false;
      isScrolling.current = false;
      shouldHandleDrag = false;
      dragStartY.current = null;
      lastTouchY.current = null;
    };
    
    // Add unified touch handlers to the entire drawer
    // Using capture phase to intercept events before they reach content elements
    drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
    drawer.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    drawer.addEventListener('touchend', handleTouchEnd);
    drawer.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart);
      drawer.removeEventListener('touchmove', handleTouchMove, { capture: true });
      drawer.removeEventListener('touchend', handleTouchEnd);
      drawer.removeEventListener('touchcancel', handleTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isExpanded, mobileMode, mobileDrawerOpen]);

  // Reset transform when expanded state changes
  useEffect(() => {
    if (drawerRef.current) {
      // Clean up any transforms and apply proper transition
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = 'transform 0.3s ease-out, top 0.3s ease-out, height 0.3s ease-out';
    }
  }, [isExpanded]);

  // Preserve expanded state when transitioning from list to detail view on mobile
  useEffect(() => {
    if (isMobile.current && location && mobileMode === 'detail' && mobileDrawerOpen) {
      // Check if we're coming from a list view that was expanded
      const listWasExpanded = !location && isExpanded;
      
      // If the drawer was already in expanded state in list view, keep it expanded
      // Otherwise, use the current value of isExpanded
      if (listWasExpanded) {
        setIsExpanded(true);
      }
    }
  }, [location, mobileMode, mobileDrawerOpen, isExpanded]);

  // Add click handlers for the pull handle
  useEffect(() => {
    const handle = pullHandleRef.current;
    if (!handle) return;
    
    const handleClick = () => {
      setIsExpanded(prev => !prev);
    };
    
    handle.addEventListener('click', handleClick);
    return () => handle.removeEventListener('click', handleClick);
  }, []);


  
  // Handle back to list navigation on mobile
  const handleBackToList = () => {
    if (isMobile.current && backToList) {
      // We want to transition to list view while preserving expanded state
      backToList();
      // Reset location without changing the expanded state
    }
  };

  // Handle closing the location list (mobile only)
  const handleCloseList = () => {
    // On mobile, this should trigger the onClose to hide the drawer completely
    if (isMobile.current) {
      onClose();
    }
  };

  // Function to get directions URL
  const getDirectionsUrl = () => {
    return location ? `https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}` : '';
  };

  // Memoize ActionButtons to prevent unnecessary re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ActionButtons = useMemo(() => {
    if (!location) return () => null;
    
    return () => (
      <div className="flex flex-col md:flex-col gap-3 w-full">
        {/* On mobile: All buttons in a single row, on desktop: original layout */}
        <div className="flex gap-2 md:hidden w-full">
          <a
            href={getDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackExternalLink('directions', location.name, getDirectionsUrl())}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center flex items-center justify-center gap-1"
          >
            <MapPin size={16} />
            Directions
          </a>
          
          {location.contact.website && (
            <a
              href={addUtmParams(location.contact.website)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternalLink('website', location.name, location.contact.website!)}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-center flex items-center justify-center gap-1"
            >
              <Globe size={16} />
              Website
            </a>
          )}
          
          {location.contact.phone && (
            <a
              href={`tel:${location.contact.phone}`}
              onClick={() => trackExternalLink('phone', location.name, `tel:${location.contact.phone}`)}
              className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 text-center flex items-center justify-center gap-1"
            >
              <Phone size={16} />
              Call
            </a>
          )}
        </div>
        
        {/* Desktop layout - keep original layout */}
        <a
          href={getDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackExternalLink('directions', location.name, getDirectionsUrl())}
          className="hidden md:flex w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center items-center justify-center gap-2"
        >
          <MapPin size={20} />
          Get Directions
        </a>
        
        <div className="hidden md:flex gap-3">
          {location.contact.website && (
            <a
              href={addUtmParams(location.contact.website)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternalLink('website', location.name, location.contact.website!)}
              className="flex-1 px-6 py-3 text-base font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-center flex items-center justify-center gap-2"
            >
              <Globe size={20} />
              Website
            </a>
          )}
          
          {location.contact.phone && (
            <a
              href={`tel:${location.contact.phone}`}
              onClick={() => trackExternalLink('phone', location.name, `tel:${location.contact.phone}`)}
              className="flex-1 px-6 py-3 text-base font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 text-center flex items-center justify-center gap-2"
            >
              <Phone size={20} />
              Call
            </a>
          )}
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Make sure placeData object is valid
  const ensurePhotoData = (data: Location['placeData'] | undefined) => {
    if (!data) return undefined;
    
    // Ensure photos array is clean - only include photos with getUrl method
    const validPhotos = data.photos?.filter(
      photo => photo && typeof photo.getUrl === 'function'
    );
    
    return {
      ...data,
      photos: validPhotos,
      photoCount: validPhotos?.length || data.photoUrls?.length || 0
    };
  };
  
  // Compute merged place data once
  const mergedPlaceData = (() => {
    // Use most recent placeData
    if (placeData) {
      return ensurePhotoData(placeData);
    }
    
    // Fall back to location's built-in place data if available
    if (location?.placeData) {
      return ensurePhotoData(location.placeData);
    }
    
    // No data available
    return undefined;
  })();
  
  // Check if we have photos (either objects or URLs)
  const hasPhotos = Boolean(
    (mergedPlaceData?.photos && mergedPlaceData.photos.length > 0) ||
    (mergedPlaceData?.photoUrls && mergedPlaceData.photoUrls.length > 0)
  );
    
  // Only show loading state when actively fetching and don't have any photos yet
  const isLoadingPhotos = isLoading && !hasPhotos;

  // Filter locations based on active filters for the list view
  const filteredLocations = useMemo(() => {
    return visibleLocations.filter(location => {
      // Activity type filter
      if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
        return false;
      }
      
      // Age filter
      if (selectedAge !== null) {
        if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
          return false;
        }
      }
      
      // Open now filter
      if (openNowFilter) {
        const now = new Date();
        const day = now.toLocaleDateString('en-US', { weekday: 'long' });
        const hours = location.openingHours[day];

        if (!hours || hours === 'Closed' || hours === 'Hours not available') {
          return false;
        }
        if (hours === 'Open 24 hours') {
          return true;
        }

        try {
          const timeParts = hours.split(/[–-]/).map(t => t.trim());
          if (timeParts.length !== 2) return false;
          const [start, end] = timeParts;
          
          const parseTime = (timeStr: string) => {
            if (!timeStr) return 0;
            const parts = timeStr.split(' ');
            if (parts.length !== 2) return 0;
            
            const [time, period] = parts;
            if (!time || !period) return 0;
            
            const [hours, minutes] = time.split(':').map(Number);
            if (isNaN(hours)) return 0;
            
            let totalHours = hours;
            if (period === 'PM' && hours !== 12) totalHours += 12;
            if (period === 'AM' && hours === 12) totalHours = 0;
            
            return totalHours * 60 + (minutes || 0);
          };

          const startMinutes = parseTime(start);
          const endMinutes = parseTime(end);
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          if (endMinutes < startMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
          }

          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } catch (error) {
          // Silent error in production
          return false;
        }
      }
      
      return true;
    });
  }, [visibleLocations, activeFilters, selectedAge, openNowFilter]);

  // Limit to first 15 locations to prevent performance issues
  const displayedLocations = filteredLocations.slice(0, 15) || [];

  // Check if we should render the drawer at all
  const shouldRenderDrawer = isMobile.current 
    ? ((location !== null) || ((mobileMode === 'list') && (mobileDrawerOpen) && (visibleLocations.length > 0)))
    : true;
  
  // If nothing to display on mobile, return null
  if (!shouldRenderDrawer) return null;

  // Desktop location list view (when no location is selected)
  if (!location && !isMobile.current) {
    return (
      <div className="hidden md:block fixed z-40 bg-white shadow-lg w-[533px] left-0 top-[calc(4rem+3.25rem)] rounded-r-lg bottom-0 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Nearby Activities</h2>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-4rem-3.25rem-76px)]">
          {displayedLocations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No locations in current view</p>
              <p className="text-sm mt-2">Try zooming out or panning the map</p>
            </div>
          ) : (
            <div>
              {displayedLocations.map(loc => (
                <LocationTile
                  key={loc.id}
                  location={loc}
                  activityConfig={activityConfig}
                  onSelect={() => onLocationSelect && onLocationSelect(loc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop - completely transparent on mobile for all views */}
      <div
        className={`fixed inset-0 z-30 md:hidden ${
          (location || (isMobile.current && mobileMode === 'list')) && drawerRef.current ? 'pointer-events-auto' : 'pointer-events-none'
        } bg-transparent`}
        onClick={handleCloseAction}
      />
      
      {/* Drawer Container */}
      <div 
        ref={drawerRef}
        className={`
          fixed z-40 bg-white shadow-lg
          md:w-[533px] left-0 md:top-[calc(4rem+3.25rem)] md:rounded-r-lg md:bottom-0
          w-full rounded-t-xl
          transition-all duration-300 ease-in-out
          ${(location || (isMobile.current && mobileMode === 'list' && mobileDrawerOpen)) ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          ${!location && 'md:translate-x-0'}
          ${isExpanded ? 'top-0 h-full' : 'bottom-0 h-[50vh]'}
          md:h-[calc(100vh-4rem-3.25rem)] md:translate-x-0
          flex flex-col
          ${(location || (isMobile.current && mobileMode === 'list' && mobileDrawerOpen)) ? 'visible' : 'md:visible invisible'}
        `}
        style={{
          // Only enable pointer events after transition completes
          pointerEvents: (location || (isMobile.current && mobileMode === 'list')) ? 'auto' : (window.innerWidth >= 768 ? 'auto' : 'none'),
          // Add slight delay to pointer events to allow transitions to complete first
          transitionDelay: (location || (isMobile.current && mobileMode === 'list')) ? '0ms' : '0ms',
          // Control drawer behavior with transform instead of top/bottom values
          willChange: 'transform',
        }}
      >
        {/* Pull Handle (visible on mobile only) */}
        <div 
          ref={pullHandleRef}
          className="h-6 w-full flex items-center justify-center cursor-pointer md:hidden"
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Location Detail View */}
        {location && (
          <>
            {/* On desktop or when NOT expanded on mobile: Header stays separate */}
            {(!isMobile.current || !isExpanded) && (
              <div
                ref={headerRef}
                className={`flex-shrink-0 bg-white border-b ${isExpanded && !isMobile.current ? 'sticky top-0 z-10' : ''}`}
              >
                <div className="flex flex-col md:p-6 p-4">
                  <div className="flex items-start justify-between mb-2 md:mb-4">
                    <div className="flex flex-col">
                      {/* Top row with back button and name */}
                      <div className="flex items-center">
                        {/* Back button for mobile only */}
                        {isMobile.current && backToList ? (
                          <button
                            onClick={handleBackToList}
                            className="p-1.5 -ml-1.5 mr-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Back to list"
                          >
                            <ChevronLeft size={20} className="text-gray-600" />
                          </button>
                        ) : (
                          <>
                            {/* This renders nothing on mobile but keeps desktop unchanged */}
                          </>
                        )}
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{location.name}</h2>
                      </div>
                      
                      {/* Rating display */}
                      {mergedPlaceData?.rating && mergedPlaceData.userRatingsTotal && (
                        <div className="mt-1 md:mt-2">
                          <RatingDisplay
                            rating={mergedPlaceData.rating}
                            totalRatings={mergedPlaceData.userRatingsTotal}
                            placeId={location.id}
                            businessName={location.name}
                          />
                        </div>
                      )}
                      
                      {/* Activity types */}
                      <div className="flex flex-wrap gap-1 md:gap-2 mt-1.5 md:mt-2">
                        {location.types.map(type => (
                          <span
                            key={type}
                            className="inline-block px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-full"
                            style={{
                              backgroundColor: activityConfig[type].color + '20',
                              color: activityConfig[type].color
                            }}
                          >
                            {activityConfig[type].name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleCloseAction}
                      className="p-2 rounded-full hover:bg-gray-100 hidden md:block"
                    >
                      <X size={24} className="text-gray-500" />
                    </button>
                  </div>

                  {/* Action Buttons - Show at top on mobile with single row layout */}
                  <div className="md:hidden mt-1">
                    <ActionButtons />
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              <div className="p-6 space-y-6">
                {/* For mobile expanded view: Include header content at the top of the scrollable area */}
                {isMobile.current && isExpanded && (
                  <div className="mb-4 -mt-2 -mx-2 bg-white">
                    <div className="flex flex-col p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-col">
                          {/* Top row with back button and name */}
                          <div className="flex items-center">
                            {/* Back button for mobile */}
                            {backToList && (
                              <button
                                onClick={handleBackToList}
                                className="p-1.5 -ml-1.5 mr-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Back to list"
                              >
                                <ChevronLeft size={20} className="text-gray-600" />
                              </button>
                            )}
                            <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
                          </div>
                          
                          {/* Rating display */}
                          {mergedPlaceData?.rating && mergedPlaceData.userRatingsTotal && (
                            <div className="mt-1">
                              <RatingDisplay
                                rating={mergedPlaceData.rating}
                                totalRatings={mergedPlaceData.userRatingsTotal}
                                placeId={location.id}
                                businessName={location.name}
                              />
                            </div>
                          )}
                          
                          {/* Activity types */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {location.types.map(type => (
                              <span
                                key={type}
                                className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                                style={{
                                  backgroundColor: activityConfig[type].color + '20',
                                  color: activityConfig[type].color
                                }}
                              >
                                {activityConfig[type].name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-1">
                        <ActionButtons />
                      </div>
                    </div>
                  </div>
                )}
                {/* Image Carousel */}
                {isLoadingPhotos ? (
                  <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="mt-2 text-gray-500">Loading photos...</span>
                    </div>
                  </div>
                ) : (
                  <ImageCarousel
                    photos={mergedPlaceData?.photos}
                    photoUrls={mergedPlaceData?.photoUrls}
                    businessName={location.name}
                    placeId={location.id}
                  />
                )}

                {/* Description */}
                <p className="text-lg text-gray-600">{location.description}</p>

                {/* Action Buttons - Show in content on desktop */}
                <div className="hidden md:block">
                  <ActionButtons />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-lg">
                    <span className="font-medium">Ages:</span>
                    <span className="ml-3 text-gray-600">
                      {location.ageRange.min}-{location.ageRange.max} years
                    </span>
                  </div>

                  {location.priceRange && (
                    <div className="flex items-center text-lg">
                      <span className="font-medium">Price:</span>
                      <span className="ml-3 text-gray-600">{location.priceRange}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">Opening Hours</h3>
                  <div className="space-y-2">
                    {Object.entries(location.openingHours).map(([day, hours]) => (
                      <div key={day} className="text-base grid grid-cols-2">
                        <span className="text-gray-600">{day}</span>
                        <span className="text-gray-900">{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pb-6">
                  <h3 className="text-xl font-medium text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2 text-base text-gray-600">
                    {location.contact.phone && (
                      <p>
                        Phone:{" "}
                        <a
                          href={`tel:${location.contact.phone}`}
                          onClick={() => trackExternalLink('phone', location.name, `tel:${location.contact.phone}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {location.contact.phone}
                        </a>
                      </p>
                    )}
                    {location.contact.email && location.contact.email !== 'email' && (
                      <p>
                        Email:{" "}
                        <a
                          href={`mailto:${location.contact.email}`}
                          onClick={() => trackExternalLink('website', location.name, `mailto:${location.contact.email}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {location.contact.email}
                        </a>
                      </p>
                    )}
                    {location.contact.website && location.contact.website !== 'website' && (
                      <p>
                        Website:{" "}
                        <a
                          href={addUtmParams(location.contact.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackExternalLink('website', location.name, location.contact.website!)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {location.contact.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </a>
                      </p>
                    )}
                    <p>Address: {location.address}</p>
                  </div>
                </div>
                
                {/* Report Issue Link */}
                <div className="mt-4 flex justify-center pb-6">
                  <button
                    onClick={() => setShowReportIssueModal(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" x2="4" y1="22" y2="15"></line>
                    </svg>
                    Report an issue with this listing
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Mobile Location List View */}
        {!location && isMobile.current && mobileMode === 'list' && (
          <>
            {/* List Header - Streamlined for mobile */}
            <div 
              ref={headerRef}
              className="flex-shrink-0 bg-white border-b"
            >
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-gray-900">Nearby Activities</h2>
                {/* Close button only shown on desktop */}
                {!isMobile.current && (
                  <button
                    onClick={handleCloseList}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            
            {/* List Content */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              {displayedLocations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No locations in current view</p>
                  <p className="text-sm mt-2">Try zooming out or panning the map</p>
                </div>
              ) : (
                <div>
                  {displayedLocations.map(loc => (
                    <LocationTile
                      key={loc.id}
                      location={loc}
                      activityConfig={activityConfig}
                      onSelect={() => onLocationSelect && onLocationSelect(loc)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Report Issue Modal */}
      {location && (
        <ReportIssueModal
          isOpen={showReportIssueModal}
          onClose={() => setShowReportIssueModal(false)}
          locationId={location.id}
          locationName={location.name}
        />
      )}
    </>
  );
});

export default Drawer;