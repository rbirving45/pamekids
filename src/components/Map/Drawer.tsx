import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import ImageCarousel from './ImageCarousel';
import { Location, ActivityType } from '../../types/location';
import { addUtmParams, trackExternalLink, trackCustomEvent } from '../../utils/analytics';
import { X, Phone, Globe, MapPin, ChevronLeft } from 'lucide-react';
import { fetchPlaceDetails } from '../../utils/places-api';
import RatingDisplay from './RatingDisplay';
import LocationTile from './LocationTile';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';
import { useTouch } from '../../contexts/TouchContext';

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
  
  // Use context hooks for mobile detection and UI state
  const { isMobile } = useMobile();
  const {
    isDrawerOpen,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDrawerOpen,
    isDrawerExpanded
  } = useUIState();
  
  // Use TouchContext hook with all needed properties - moved before any conditional returns
  const { drawerState, setDrawerState, handleTouchStart, handleTouchMove, handleTouchEnd, isPartialDrawer, setContentScrollPosition, isModalOpen } = useTouch();
  
  // Debug log to verify TouchContext is available (only in development)
  // Use a static check to ensure we only log once per component instance
  const hasLoggedRef = useRef(false);
  if (process.env.NODE_ENV === 'development' && !hasLoggedRef.current) {
    console.groupCollapsed('TouchContext initialization');
    console.log('Initial drawer state:', drawerState);
    console.log('Modal open:', isModalOpen);
    console.groupEnd();
    hasLoggedRef.current = true;
  }

  // Add effect to log when modal state changes (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Drawer] Modal state changed: ${isModalOpen ? 'OPEN' : 'CLOSED'}`);
    }
  }, [isModalOpen]);
  
  const [placeData, setPlaceData] = useState<Location['placeData']>();
  const [isLoading, setIsLoading] = useState(false);
  // Used for tracking fetch status - intentionally not used directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  // Used for forcing photo refresh - intentionally not used directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_fetchTimestamp, setFetchTimestamp] = useState(0);
  
  // Mobile drawer state - list or detail view
  const [mobileMode, setMobileMode] = useState<'list' | 'detail'>('list');
  
  const drawerRef = useRef<HTMLDivElement>(null);
  const pullHandleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const dragStartY = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastTouchY = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchStartTime = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const isScrolling = useRef<boolean>(false);

  // Since we've centralized touch handling, we no longer need to sync backwards
  // This effect is now only for logging purposes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Using console.groupCollapsed to minimize console clutter
      console.groupCollapsed(`Drawer state changed: ${drawerState}`);
      console.log('Drawer state updated at:', new Date().toISOString());
      console.groupEnd();
    }
  }, [drawerState]);
  
  // Determine which view to show on mobile
  useEffect(() => {
    if (isMobile) {
      if (location) {
        setMobileMode('detail');
        // Don't reset the expanded state when transitioning from list to detail
      } else {
        setMobileMode('list');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isMobile]);
  
  // Return early if mobile drawer should be closed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isMobile && (!mobileDrawerOpen && !location)) {
      // Reset any transform and animation when drawer is closed
      if (drawerRef.current) {
        drawerRef.current.style.transform = '';
        drawerRef.current.style.transition = 'transform 0.3s ease-out';
      }
    }
  }, [mobileDrawerOpen, location, isMobile]);
  
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

  // Import the updateLocationPlaceData function at the top of the file
  // Add this import statement along with the other imports
  
  // Simplified fetchData function that only uses Firestore data, no background refreshes
  const fetchData = useCallback(async () => {
    if (!locationId) return;
    
    setIsLoading(true);
    setHasAttemptedFetch(true);
    
    try {
      // Call fetchPlaceDetails without Google Maps API, it will fetch from Firestore
      const data = await fetchPlaceDetails(locationId);
      
      if (data) {
        let finalData;
        
        if (location?.placeData) {
          // Merge with existing data, prioritizing any existing values
          const mergedData = {
            ...data,               // Start with Firestore data
            ...location.placeData, // Prioritize any data already in the location object
            // Preserve photoUrls from either source
            photoUrls: location.placeData.photoUrls?.length ? location.placeData.photoUrls : data.photoUrls
          };
          
          finalData = mergedData;
        } else {
          finalData = data;
        }
        
        // Update state with the place data
        setPlaceData(finalData);
        
        // Update the location object reference
        if (location) {
          location.placeData = finalData;
        }
      }
    } catch (error) {
      console.error('Error fetching place details from Firestore:', error);
      // Fallback to existing place data if available
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
      const timer = setTimeout(() => {
        fetchData();
      }, 10); // Small delay to prioritize UI rendering first
      
      return () => clearTimeout(timer);
    }
  }, [locationId, fetchData]);

  // Simplified effect to use existing placeData without background refreshes
  useEffect(() => {
    // If location has placeData already, use it immediately to prevent flickering
    if (location?.placeData && !placeData) {
      setPlaceData(location.placeData);
      setIsLoading(false);
    }
  }, [location, placeData]);

  // Touch handling is now fully managed by TouchContext
  // This comment is kept to document the migration
  
  // Add effect to ensure drawer gets proper pointer events after rendering
  useEffect(() => {
    if (location || (isMobile && mobileMode === 'list')) {
      // Small delay to let the drawer positioning settle before enabling interactions
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.style.pointerEvents = 'auto';
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [location, mobileMode, isMobile]);

  // Handle drawer close action
  const handleCloseAction = () => {
    // Always close the drawer completely
    setDrawerState('closed');
    // Also call onClose for backward compatibility
    onClose();
  };

  // TouchContext now manages all drawer touch interactions

  // Reset transform when drawer state changes
  useEffect(() => {
    if (drawerRef.current) {
      // Clean up any transforms and apply proper transition
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = 'transform 0.3s ease-out, top 0.3s ease-out, height 0.3s ease-out';
    }
  }, [drawerState]);
  
  // Track scroll position of content container
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        // Check if scrolled to the top
        const isAtTop = contentRef.current.scrollTop <= 10; // Using small threshold to account for elastic scroll on iOS
        setContentScrollPosition(isAtTop);
      }
    };
    
    // Add scroll event listener to content container
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }
    
    return () => {
      if (contentEl) {
        contentEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [setContentScrollPosition, drawerState]);

  // Preserve drawer state when transitioning from list to detail view on mobile
  useEffect(() => {
    if (isMobile && location && mobileMode === 'detail' && mobileDrawerOpen) {
      // When transitioning from list to detail, maintain the same drawer state
      // No need to update anything since drawerState is now centrally managed
      // and persists across view transitions
    }
  }, [location, mobileMode, mobileDrawerOpen, isMobile, drawerState]);

  // Add click handlers for the pull handle
  useEffect(() => {
    const handle = pullHandleRef.current;
    if (!handle) return;
    
    const handleClick = () => {
      // Toggle between partial and full state
      setDrawerState(drawerState === 'partial' ? 'full' : 'partial');
    };
    
    handle.addEventListener('click', handleClick);
    return () => handle.removeEventListener('click', handleClick);
  }, [setDrawerState, drawerState]);


  
  // Handle back to list navigation on mobile
  const handleBackToList = () => {
    if (isMobile && backToList) {
      console.log('Back button clicked in drawer state:', drawerState); // Debug log
      
      // We want to transition to list view while preserving expanded state
      backToList();
      
      // Reset location without changing the expanded state
      // No need to modify drawer state as backToList will handle this
    }
  };

  // Handle closing the location list (mobile only)
  const handleCloseList = () => {
    // On mobile, this should trigger the onClose to hide the drawer completely
    if (isMobile) {
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
            onClick={() => trackExternalLink(
              'directions',
              location.name,
              getDirectionsUrl(),
              location.id,
              'detail'
            )}
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
              onClick={() => trackExternalLink(
                'website',
                location.name,
                location.contact.website!,
                location.id,
                'detail'
              )}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-center flex items-center justify-center gap-1"
            >
              <Globe size={16} />
              Website
            </a>
          )}
          
          {location.contact.phone && (
            <a
              href={`tel:${location.contact.phone}`}
              onClick={() => trackExternalLink(
                'phone',
                location.name,
                `tel:${location.contact.phone}`,
                location.id,
                'detail'
              )}
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
          onClick={() => trackExternalLink(
            'directions',
            location.name,
            getDirectionsUrl(),
            location.id,
            'detail'
          )}
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
              onClick={() => trackExternalLink(
                'website',
                location.name,
                location.contact.website!,
                location.id,
                'detail'
              )}
              className="flex-1 px-6 py-3 text-base font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-center flex items-center justify-center gap-2"
            >
              <Globe size={20} />
              Website
            </a>
          )}
          
          {location.contact.phone && (
            <a
              href={`tel:${location.contact.phone}`}
              onClick={() => trackExternalLink(
                'phone',
                location.name,
                `tel:${location.contact.phone}`,
                location.id,
                'detail'
              )}
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
  const shouldRenderDrawer = isMobile
    ? ((location !== null) || ((mobileMode === 'list') && (mobileDrawerOpen) && (visibleLocations.length > 0)))
    : true;
  
  // If nothing to display on mobile, return null
  if (!shouldRenderDrawer) return null;

  // Desktop location list view (when no location is selected)
  if (!location && !isMobile) {
    return (
      <div className="hidden md:block fixed z-drawer-container bg-white shadow-lg w-[533px] left-0 top-[calc(4rem+3.25rem)] rounded-r-lg bottom-0 overflow-hidden">
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
      {/* Backdrop - only visible on mobile when drawer is open */}
      {isMobile && isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black z-drawer-backdrop"
          onClick={onClose}
          style={{
            pointerEvents: 'auto',
            opacity: drawerState === 'full'
              ? 'var(--backdrop-opacity-full)'
              : 'var(--backdrop-opacity-partial)',
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
      
      {/* Drawer Container */}
      <div 
        ref={drawerRef}
        className={`
          fixed z-drawer-container bg-white shadow-lg
          md:w-[533px] left-0 md:top-[calc(4rem+3.25rem)] md:rounded-r-lg md:bottom-0
          w-full rounded-t-xl overflow-hidden
          transition-all duration-300 ease-in-out
          ${drawerState !== 'closed' ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          ${drawerState === 'full' ? 'top-0 h-full' : drawerState === 'partial' ? 'bottom-0 h-[var(--mobile-drawer-partial-height,50vh)]' : ''}
          md:h-[calc(100vh-4rem-3.25rem)] md:translate-x-0
          flex flex-col
        `}
        style={{
          // Disable all pointer events when a modal is open
          pointerEvents: isModalOpen ? 'none' : (drawerState !== 'closed' ? 'auto' : (isMobile ? 'none' : 'auto')),
          willChange: 'transform',
          // Add a CSS variable to control opacity when modal is open
          opacity: isModalOpen ? 0.5 : 1,
          // Completely disable touch events when modal is open
          touchAction: isModalOpen ? 'none' : (isPartialDrawer ? 'none' : 'pan-y'),
          // Prevent any touch events from being captured when modal is open
          WebkitUserSelect: isModalOpen ? 'none' : 'auto',
          userSelect: isModalOpen ? 'none' : 'auto',
        }}
        onTouchStartCapture={(e) => {
          // When a modal is open, completely prevent drawer interaction
          if (isModalOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleTouchStart(e);
        }}
        onTouchMoveCapture={(e) => {
          // When a modal is open, completely prevent drawer interaction
          if (isModalOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleTouchMove(e);
        }}
        onTouchEndCapture={(e) => {
          // When a modal is open, completely prevent drawer interaction
          if (isModalOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleTouchEnd(e);
        }}
      >
        {/* Pull Handle with improved styles and visual indication when in partial state */}
        <div 
          ref={pullHandleRef}
          className={`h-8 w-full flex items-center justify-center cursor-pointer md:hidden z-drawer-pull-handle ${isPartialDrawer ? 'bg-blue-50' : 'bg-gray-50'} drawer-block-all`}
          onClick={() => {
            // Toggle between partial and full states
            setDrawerState(drawerState === 'partial' ? 'full' : 'partial');
          }}
          onTouchStart={(e) => {
            // When a modal is open, block all drawer interactions
            if (isModalOpen) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            
            // Mark this touch event for the pull handle
            // to differentiate it from drawer dragging
            e.currentTarget.setAttribute('data-touch-active', 'true');
            // Stop propagation to prevent map gestures
            e.stopPropagation();
            // Prevent default to ensure no map interaction
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            // When a modal is open, block all drawer interactions
            if (isModalOpen) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            
            // Handle tap on pull handle to toggle expansion
            // only if this was a genuine tap (not part of a drag)
            if (e.currentTarget.getAttribute('data-touch-active') === 'true') {
              // Toggle drawer state
              setDrawerState(drawerState === 'partial' ? 'full' : 'partial');
            }
            // Clear the touch state
            e.currentTarget.removeAttribute('data-touch-active');
            // Stop propagation and prevent default
            e.stopPropagation();
            e.preventDefault();
          }}
          onTouchMove={(e) => {
            // If significant movement occurs, this is a drag not a tap
            // Clear the touch-active flag to prevent toggle on touch end
            e.currentTarget.removeAttribute('data-touch-active');
            // Don't prevent default here to allow drawer dragging
            // But do stop propagation
            e.stopPropagation();
          }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Location Detail View */}
        {location && (
          <>
            {/* On desktop or when NOT expanded on mobile: Header stays separate */}
            {(!isMobile || drawerState !== 'full') && (
              <div
                ref={headerRef}
                className={`flex-shrink-0 bg-white border-b ${drawerState === 'full' && !isMobile ? 'sticky top-0 z-drawer-header-sticky' : 'z-drawer-header'}`}
                onTouchStart={(e) => {
                  // Stop propagation to prevent map gestures
                  e.stopPropagation();
                }}
                onTouchMove={(e) => {
                  // In partial drawer mode, prevent default to block map interaction
                  if (!isDrawerExpanded) {
                    e.preventDefault();
                  }
                  // Always stop propagation
                  e.stopPropagation();
                }}
              >
                <div className="flex flex-col md:p-6 p-4">
                  <div className="flex items-start justify-between mb-2 md:mb-4">
                    <div className="flex flex-col">
                      {/* Top row with back button and name */}
                      <div className="flex items-center">
                        {/* Back button for mobile only */}
                        {isMobile && backToList ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Stop event bubbling
                              handleBackToList();   // Call the handler directly
                            }}
                            className="p-1.5 -ml-1.5 mr-2 rounded-full hover:bg-gray-100 transition-colors relative z-10"
                            aria-label="Back to list"
                            onTouchStart={(e) => {
                              // Stop propagation to prevent map gestures
                              e.stopPropagation();
                              // Also prevent default
                              e.preventDefault();
                            }}
                            onTouchEnd={(e) => {
                              // Stop propagation and prevent default
                              e.stopPropagation();
                              e.preventDefault();
                              
                              // Directly trigger the back action on touch end
                              handleBackToList();
                            }}
                            style={{ touchAction: 'none' }} /* Prevent any touch action defaults */
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
                            activityTypes={location.types}
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

            {/* Scrollable Content - with conditional scrolling based on drawer state */}
            <div 
              ref={contentRef}
              className={`flex-1 ${isPartialDrawer ? 'overflow-hidden drawer-no-scroll' : 'overflow-y-auto overscroll-contain'} drawer-block-map`}
              style={{
                touchAction: isPartialDrawer ? 'none' : 'pan-y',
                pointerEvents: 'auto',
                WebkitOverflowScrolling: isPartialDrawer ? undefined : 'touch', // Only enable smooth scrolling in full state
                overscrollBehavior: 'contain' // Prevent scroll chaining
              }}
            >
              <div className="p-6 space-y-6">
                {/* For mobile expanded view: Include header content at the top of the scrollable area */}
                {isMobile && drawerState === 'full' && (
                  <div className="mb-4 -mt-2 -mx-2 bg-white">
                    <div className="flex flex-col p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-col">
                          {/* Top row with back button and name */}
                          <div className="flex items-center">
                            {/* Back button for mobile */}
                            {backToList && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop event bubbling
                                  handleBackToList();   // Call the handler directly
                                }}
                                className="p-1.5 -ml-1.5 mr-2 rounded-full hover:bg-gray-100 transition-colors relative z-10"
                                aria-label="Back to list"
                                onTouchStart={(e) => {
                                  // Stop propagation to prevent map gestures
                                  e.stopPropagation();
                                  // Also prevent default
                                  e.preventDefault();
                                }}
                                onTouchEnd={(e) => {
                                  // Stop propagation and prevent default
                                  e.stopPropagation();
                                  e.preventDefault();
                                  
                                  // Directly trigger the back action on touch end
                                  handleBackToList();
                                }}
                                style={{ touchAction: 'none' }} /* Prevent any touch action defaults */
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
                <div className="drawer-content-section">
                  <p className="text-lg text-gray-600 touchable-text">{location.description}</p>
                </div>

                {/* Pro Tips - Always shown to encourage submissions */}
                <div className="drawer-content-section bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center touchable-text">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-600">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    Pro Tips
                  </h3>
                  
                  {location.proTips ? (
                    <div className="text-gray-700 touchable-text whitespace-pre-line">
                      {location.proTips}
                    </div>
                  ) : (
                    <div className="text-gray-700 touchable-text">
                      <p className="italic">No pro tips yet for this location. Be the first to share your insider knowledge!</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => {
                        // Track this interaction with the new trackCustomEvent function
                        trackCustomEvent(
                          'pro_tip_click',
                          'Content Interaction',
                          location.name,
                          {
                            business_name: location.name,
                            location_id: location.id,
                            interaction_type: location.proTips ? 'add_pro_tip' : 'first_pro_tip'
                          }
                        );
                        
                        // Use the global function to open the modal with pro-tips
                        (window as any).openReportIssueModal(location.id, location.name, 'pro-tips');
                      }}
                      className={`text-sm ${location.proTips ? 'text-blue-600 hover:text-blue-800' : 'bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg'} flex items-center gap-1`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
                        <path d="M5 12h14"></path>
                        <path d="M12 5v14"></path>
                      </svg>
                      {location.proTips ? 'Submit a Pro Tip' : 'Be the first to share a Pro Tip!'}
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Show in content on desktop */}
                <div className="hidden md:block">
                  <ActionButtons />
                </div>

                <div className="space-y-3 drawer-content-section">
                  <div className="flex items-center text-lg">
                    <span className="font-medium touchable-text">Ages:</span>
                    <span className="ml-3 text-gray-600 touchable-text">
                      {location.ageRange.min}-{location.ageRange.max} years
                    </span>
                  </div>

                  {location.priceRange && (
                    <div className="flex items-center text-lg">
                      <span className="font-medium touchable-text">Price:</span>
                      <span className="ml-3 text-gray-600 touchable-text">{location.priceRange}</span>
                    </div>
                  )}
                </div>

                <div className="drawer-content-section">
                  <h3 className="text-xl font-medium text-gray-900 mb-3 touchable-text">Opening Hours</h3>
                  <div className="space-y-2">
                    {Object.entries(location.openingHours).map(([day, hours]) => (
                      <div key={day} className="text-base grid grid-cols-2">
                        <span className="text-gray-600 touchable-text">{day}</span>
                        <span className="text-gray-900 touchable-text">{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pb-6 drawer-content-section">
                  <h3 className="text-xl font-medium text-gray-900 mb-3 touchable-text">Contact Information</h3>
                  <div className="space-y-2 text-base text-gray-600">
                    {location.contact.phone && (
                      <p className="touchable-text">
                        Phone:{" "}
                        <a
                          href={`tel:${location.contact.phone}`}
                          onClick={() => trackExternalLink(
                            'phone',
                            location.name,
                            `tel:${location.contact.phone}`,
                            location.id,
                            'detail'
                          )}
                          className="text-blue-600 hover:text-blue-800 hover:underline touchable-text"
                        >
                          {location.contact.phone}
                        </a>
                      </p>
                    )}
                    {location.contact.email && location.contact.email !== 'email' && (
                      <p className="touchable-text">
                        Email:{" "}
                        <a
                          href={`mailto:${location.contact.email}`}
                          onClick={() => trackExternalLink(
                            'email',
                            location.name,
                            `mailto:${location.contact.email}`,
                            location.id,
                            'detail'
                          )}
                          className="text-blue-600 hover:text-blue-800 hover:underline touchable-text"
                        >
                          {location.contact.email}
                        </a>
                      </p>
                    )}
                    {location.contact.website && location.contact.website !== 'website' && (
                      <p className="touchable-text">
                        Website:{" "}
                        <a
                          href={addUtmParams(location.contact.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackExternalLink(
                            'website',
                            location.name,
                            location.contact.website!,
                            location.id,
                            'detail'
                          )}
                          className="text-blue-600 hover:text-blue-800 hover:underline touchable-text"
                        >
                          {location.contact.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </a>
                      </p>
                    )}
                    <p className="touchable-text">Address: {location.address}</p>
                  </div>
                </div>
                
                {/* Report Issue Link */}
                <div className="mt-4 flex justify-center pb-6">
                  <button
                    onClick={() => {
                      // Track this interaction
                      trackCustomEvent(
                        'report_issue_click',
                        'Content Interaction',
                        location.name,
                        {
                          business_name: location.name,
                          location_id: location.id,
                          interaction_type: 'incorrect-info'
                        }
                      );
                    
                      // Use the global function to open the modal with incorrect-info
                      (window as any).openReportIssueModal(location.id, location.name, 'incorrect-info');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" x2="4" y1="22" y2="15"></line>
                    </svg>
                    Submit an Update or Report an Issue
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Mobile Location List View */}
        {!location && isMobile && mobileMode === 'list' && (
          <>
            {/* List Header - Streamlined for mobile */}
            <div 
              ref={headerRef}
              className="flex-shrink-0 bg-white border-b"
              onTouchStart={(e) => {
                // Stop propagation to prevent map gestures
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                // In partial drawer mode, prevent default to block map interaction
                if (!isDrawerExpanded) {
                  e.preventDefault();
                }
                // Always stop propagation
                e.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-gray-900">Nearby Activities</h2>
                {/* Close button only shown on desktop */}
                {!isMobile && (
                  <button
                    onClick={handleCloseList}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            
            {/* List Content - with conditional scrolling based on drawer state */}
            <div 
              ref={contentRef}
              className={`flex-1 ${isPartialDrawer ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'} drawer-block-map`}
              style={{
                touchAction: isPartialDrawer ? 'none' : 'pan-y',
                pointerEvents: 'auto'
              }}
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
    </>
  );
});

export default Drawer;