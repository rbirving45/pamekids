import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import ImageCarousel from './ImageCarousel';
import { Location, ActivityType } from '../../data/locations';
import { addUtmParams, trackExternalLink } from '../../utils/analytics';
import { X, Phone, Globe, MapPin, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchPlaceDetails } from '../../utils/places-api';
import RatingDisplay from './RatingDisplay';
import ReportIssueModal from '../ReportIssue/ReportIssueModal';

interface DrawerProps {
  location: Location | null;
  onClose: () => void;
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  featuredLocations: Location[];
  onSelectLocation: (location: Location) => void;
  mode: 'details' | 'featured';
  onModeChange: (mode: 'details' | 'featured') => void;
}

// Using memo to prevent unnecessary re-renders when props don't change
const UnifiedDrawer: React.FC<DrawerProps> = memo(({ 
  location, 
  onClose, 
  activityConfig, 
  featuredLocations,
  onSelectLocation,
  mode,
  onModeChange
}) => {
  // Store location ID to prevent unnecessary effect triggers
  const locationId = location?.id;
  
  const [placeData, setPlaceData] = useState<Location['placeData']>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [fetchTimestamp, setFetchTimestamp] = useState(0);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [placesData, setPlacesData] = useState<Record<string, any>>({});
  
  // Mobile drawer state
  const [isExpanded, setIsExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pullHandleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchDragDistance = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const isScrolling = useRef<boolean>(false);
  const lastScrollTop = useRef<number>(0);
  
  // Clear state when location changes
  useEffect(() => {
    if (mode === 'details') {
      setPlaceData(undefined);
      setIsLoading(false);
      setHasAttemptedFetch(false);
      setFetchTimestamp(Date.now()); // Use timestamp to force new photo loading
    }
    
    setIsExpanded(false); // Reset drawer expansion state
    
    // Reset any active drag when location changes
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = 'transform 0.3s ease-out';
    }
    isDragging.current = false;
    isScrolling.current = false;
  }, [locationId, mode]);

  // Your existing fetchData function
  const fetchData = useCallback(async () => {
    if (!locationId || !window.google?.maps || mode !== 'details') return;
    
    setIsLoading(true);
    setHasAttemptedFetch(true);
    
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
  }, [locationId, location, fetchTimestamp, mode]);

  // Fetch place data for featured locations
  useEffect(() => {
    if (!window.google?.maps || mode !== 'featured') return;
    
    const fetchFeaturedData = async () => {
      const newPlacesData = { ...placesData };
      let hasNewData = false;
      
      // Process locations in batches to prevent overwhelming the Places API
      for (const location of featuredLocations) {
        // Skip if we already have this location's data
        if (placesData[location.id]) continue;
        
        try {
          const data = await fetchPlaceDetails(location.id, window.google.maps);
          if (data) {
            newPlacesData[location.id] = data;
            hasNewData = true;
            
            // If the location has placeData already, merge with new data
            if (location.placeData) {
              location.placeData = {
                ...location.placeData,
                ...data,
                photos: [
                  ...(data.photos || []),
                  ...(location.placeData.photos || [])
                ].filter(Boolean),
                photoUrls: data.photoUrls?.length ? data.photoUrls : location.placeData.photoUrls
              };
            } else {
              location.placeData = data;
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${location.name}:`, error);
        }
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (hasNewData) {
        setPlacesData(newPlacesData);
      }
    };
    
    fetchFeaturedData();
  }, [featuredLocations, mode]);

  // Fetch data immediately when a location is selected
  useEffect(() => {
    if (locationId && mode === 'details') {
      fetchData();
    }
  }, [locationId, fetchData, mode]);

  // Reset scroll position when in featured mode
  useEffect(() => {
    if (mode === 'featured' && carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [mode]);

  // Mobile overflow handling
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if ((location && mode === 'details') || mode === 'featured') {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [location, mode]);

  // Handle wheel events for scrolling
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile || (mode !== 'details' && mode !== 'featured') || !drawerRef.current) return;
    
    const drawer = drawerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      // If scrolling down (deltaY > 0) and drawer is in half state, expand it
      if (!isExpanded && e.deltaY > 0) {
        setIsExpanded(true);
        e.preventDefault(); // Prevent actual scrolling during transition
      }
    };
    
    drawer.addEventListener('wheel', handleWheel, { passive: false });
    return () => drawer.removeEventListener('wheel', handleWheel);
  }, [location, isExpanded, mode]);
  
  // Add effect to ensure drawer gets proper pointer events after rendering
  useEffect(() => {
    if (location || mode === 'featured') {
      // Small delay to let the drawer positioning settle before enabling interactions
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.style.pointerEvents = 'auto';
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [location, mode]);

  // Handle touch events for the pull handle and header
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile || (mode !== 'details' && mode !== 'featured')) return;
    
    const handle = pullHandleRef.current;
    const header = headerRef.current;
    
    if (!handle || !header || !drawerRef.current) return;
    
    const draggableElements = [handle, header];
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate drag if the touch started on the handle or header
      isDragging.current = true;
      isScrolling.current = false;
      
      // Store initial touch position
      dragStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      touchDragDistance.current = 0;
      
      // Remove transition during drag for immediate response
      if (drawerRef.current) {
        drawerRef.current.style.transition = 'none';
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || dragStartY.current === null || lastTouchY.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - dragStartY.current;
      
      // Update tracking variables
      lastTouchY.current = currentY;
      touchDragDistance.current = deltaY;
      
      // Apply resistance factor for downward dragging
      let moveY;
      if (deltaY > 0) { // Dragging downward
        const resistance = isExpanded ? 0.5 : 0.3;
        moveY = deltaY * resistance;
      } else { // Dragging upward
        const resistance = isExpanded ? 0.8 : 0.5;
        moveY = deltaY * resistance;
      }
      
      // Apply transform to follow finger with the current offset
      if (drawerRef.current) {
        drawerRef.current.style.transform = `translateY(${moveY}px)`;
      }
      
      // Prevent default to avoid page scrolling while dragging the drawer
      e.preventDefault();
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current || dragStartY.current === null || lastTouchY.current === null) {
        // Reset state
        isDragging.current = false;
        dragStartY.current = null;
        lastTouchY.current = null;
        return;
      }
      
      // Re-enable transition for smooth animation to final state
      if (drawerRef.current) {
        drawerRef.current.style.transition = 'transform 0.3s ease-out';
      }
      
      // Calculate total movement distance
      const totalDeltaY = lastTouchY.current - dragStartY.current;
      
      // Measure swipe speed
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime.current;
      const swipeVelocity = Math.abs(totalDeltaY) / touchDuration;
      
      // Apply logic based on distance, velocity and current state
      if (isExpanded) {
        // Currently expanded
        if (totalDeltaY > 100 || (totalDeltaY > 50 && swipeVelocity > 0.5)) {
          // Collapse to half state with significant downward swipe or moderate swipe with speed
          setIsExpanded(false);
        } else if (totalDeltaY > 250 || (totalDeltaY > 150 && swipeVelocity > 0.8)) {
          // Very large swipe or fast large swipe - close drawer
          onClose();
        } else {
          // Not enough movement - reset to expanded state
          if (drawerRef.current) {
            drawerRef.current.style.transform = '';
          }
        }
      } else {
        // Currently in half state
        if (totalDeltaY < -80 || (totalDeltaY < -40 && swipeVelocity > 0.5)) {
          // Expand with significant upward swipe or moderate swipe with speed
          setIsExpanded(true);
        } else if (totalDeltaY > 180 || (totalDeltaY > 100 && swipeVelocity > 0.8)) {
          // Close drawer with significant downward swipe or moderate fast swipe
          onClose();
        } else {
          // Not enough movement - reset to half state
          if (drawerRef.current) {
            drawerRef.current.style.transform = '';
          }
        }
      }
      
      // Reset state
      isDragging.current = false;
      dragStartY.current = null;
      lastTouchY.current = null;
    };
    
    // Add events to handle and header for dragging
    draggableElements.forEach(element => {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
    });
    
    return () => {
      draggableElements.forEach(element => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      });
    };
  }, [location, isExpanded, onClose, mode]);

  // Handle special touch events for the content area
  // This allows content scrolling but also detects swipe-to-close when at the top
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile || (mode !== 'details' && mode !== 'featured') || !contentRef.current || !drawerRef.current) return;
    
    const content = contentRef.current;
    
    // Track scroll position to determine if we're at the top
    const handleScroll = () => {
      lastScrollTop.current = content.scrollTop;
    };
    
    // This handles the initial touch on the content area
    const handleContentTouchStart = (e: TouchEvent) => {
      // Store the initial position but don't start dragging yet
      dragStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      
      // We're not dragging or scrolling yet - we'll determine which in touchmove
      isDragging.current = false;
      isScrolling.current = false;
    };
    
    // This determines if we're scrolling content or trying to close the drawer
    const handleContentTouchMove = (e: TouchEvent) => {
      if (dragStartY.current === null || lastTouchY.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - lastTouchY.current; // Movement since last event
      const totalDeltaY = currentY - dragStartY.current; // Total movement
      
      // Update for next event
      lastTouchY.current = currentY;
      
      // If we haven't decided yet whether this is a scroll or drawer drag
      if (!isDragging.current && !isScrolling.current) {
        // If we're at the top and trying to drag down, it's a drawer drag
        if (content.scrollTop <= 0 && deltaY > 0) {
          isDragging.current = true;
          
          // Remove transition for immediate response
          if (drawerRef.current) {
            drawerRef.current.style.transition = 'none';
          }
        } else {
          // Otherwise it's a normal content scroll
          isScrolling.current = true;
        }
      }
      
      // If we determined this is a drawer drag
      if (isDragging.current && drawerRef.current) {
        // Apply resistance for smoother dragging
        const resistance = isExpanded ? 0.5 : 0.3;
        const moveY = totalDeltaY * resistance;
        
        // Move the drawer
        drawerRef.current.style.transform = `translateY(${moveY}px)`;
        
        // Prevent default to avoid content scrolling simultaneously
        e.preventDefault();
      }
      // If it's a normal scroll, let the browser handle it
    };
    
    // Handle the end of touch on content
    const handleContentTouchEnd = (e: TouchEvent) => {
      // If we were dragging the drawer via content
      if (isDragging.current && dragStartY.current !== null && lastTouchY.current !== null && drawerRef.current) {
        // Re-enable transitions
        drawerRef.current.style.transition = 'transform 0.3s ease-out';
        
        // Calculate movement metrics
        const totalDeltaY = lastTouchY.current - dragStartY.current;
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime.current;
        const swipeVelocity = Math.abs(totalDeltaY) / touchDuration;
        
        // Apply drawer state changes based on gesture
        if (isExpanded) {
          if (totalDeltaY > 100 || (totalDeltaY > 50 && swipeVelocity > 0.5)) {
            setIsExpanded(false);
          } else if (totalDeltaY > 250 || (totalDeltaY > 150 && swipeVelocity > 0.8)) {
            onClose();
          } else {
            drawerRef.current.style.transform = '';
          }
        } else {
          if (totalDeltaY > 180 || (totalDeltaY > 100 && swipeVelocity > 0.8)) {
            onClose();
          } else {
            drawerRef.current.style.transform = '';
          }
        }
      }
      
      // Reset all tracking state
      isDragging.current = false;
      isScrolling.current = false;
      dragStartY.current = null;
      lastTouchY.current = null;
    };
    
    // Add event listeners to content area
    content.addEventListener('scroll', handleScroll, { passive: true });
    content.addEventListener('touchstart', handleContentTouchStart, { passive: true });
    content.addEventListener('touchmove', handleContentTouchMove, { passive: false });
    content.addEventListener('touchend', handleContentTouchEnd);
    
    return () => {
      content.removeEventListener('scroll', handleScroll);
      content.removeEventListener('touchstart', handleContentTouchStart);
      content.removeEventListener('touchmove', handleContentTouchMove);
      content.removeEventListener('touchend', handleContentTouchEnd);
    };
  }, [location, isExpanded, onClose, mode]);

  // Reset transform when expanded state changes
  useEffect(() => {
    if (drawerRef.current) {
      // Clean up any transforms and apply proper transition
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = 'transform 0.3s ease-out, top 0.3s ease-out, height 0.3s ease-out';
    }
  }, [isExpanded]);

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
  
  // Scroll carousel left/right for featured locations
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = direction === 'left' ? -300 : 300;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Function to get directions URL
  const getDirectionsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${location?.coordinates.lat},${location?.coordinates.lng}`;
  };

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
  
  // Get a reliable background image URL for featured locations
  const getBackgroundImage = (featuredLocation: Location): string | undefined => {
    // First try location.images if available
    if (featuredLocation.images && featuredLocation.images.length > 0) {
      return featuredLocation.images[0];
    } 
    
    // Then try location's placeData.photoUrls
    if (featuredLocation.placeData?.photoUrls && featuredLocation.placeData.photoUrls.length > 0) {
      return featuredLocation.placeData.photoUrls[0];
    }
    
    // Then try our fetched placesData.photoUrls
    if (placesData[featuredLocation.id]?.photoUrls && placesData[featuredLocation.id].photoUrls.length > 0) {
      return placesData[featuredLocation.id].photoUrls[0];
    }
    
    // If still no image, check if we can generate one from photos
    if (featuredLocation.placeData?.photos && featuredLocation.placeData.photos.length > 0) {
      try {
        const photo = featuredLocation.placeData.photos[0];
        if (photo && typeof photo.getUrl === 'function') {
          return photo.getUrl({ maxWidth: 500, maxHeight: 300 });
        }
      } catch (e) {
        console.warn('Failed to get photo URL:', e);
      }
    }
    
    // No image available
    return undefined;
  };
  
  // Compute merged place data once for location details
  const mergedPlaceData = (() => {
    if (mode !== 'details' || !location) return undefined;
    
    // Use most recent placeData
    if (placeData) {
      return ensurePhotoData(placeData);
    }
    
    // Fall back to location's built-in place data if available
    if (location.placeData) {
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

  // Memoize ActionButtons to prevent unnecessary re-renders
  const ActionButtons = useMemo(() => {
    if (!location || mode !== 'details') return () => null;
    
    return () => (
      <div className="flex flex-col gap-3 w-full">
        <a
          href={getDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackExternalLink('directions', location.name, getDirectionsUrl())}
          className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center flex items-center justify-center gap-2"
        >
          <MapPin size={20} />
          Get Directions
        </a>
        
        <div className="flex gap-3">
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
  }, [location, mode]);

  // Early return if needed
  const shouldShowDrawer = mode === 'featured' || (mode === 'details' && location);
  if (!shouldShowDrawer) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden ${
          shouldShowDrawer && drawerRef.current ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer Container */}
      <div 
        ref={drawerRef}
        className={`
          fixed md:absolute z-40 bg-white shadow-lg
          md:w-[533px] left-0 md:top-0 md:rounded-r-lg
          w-full rounded-t-xl
          transition-all duration-300 ease-in-out
          ${shouldShowDrawer ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:-translate-x-full'}
          ${isExpanded ? 'top-0 h-full' : 'bottom-0 h-[50vh]'}
          md:h-full
          flex flex-col
          ${shouldShowDrawer ? 'visible' : 'invisible'}
        `}
        style={{
          // Only enable pointer events after transition completes
          pointerEvents: shouldShowDrawer ? 'auto' : 'none',
          // Add slight delay to pointer events to allow transitions to complete first
          transitionDelay: shouldShowDrawer ? '0ms' : '0ms',
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
        
        {/* FEATURED LOCATIONS VIEW */}
        {mode === 'featured' && (
          <>
            <div ref={headerRef} className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Featured Places</h2>
                <p className="text-sm text-gray-600 mt-1">Discover top locations for kids</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto"
            >
              {/* Mobile Layout */}
              <div className="md:hidden px-4 pt-2 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Featured Places</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => scrollCarousel('left')}
                      className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => scrollCarousel('right')}
                      className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200"
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div
                  ref={carouselRef}
                  className="flex overflow-x-auto pb-2 gap-3 snap-x snap-mandatory scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {featuredLocations.map((featuredLocation) => {
                    const backgroundImage = getBackgroundImage(featuredLocation);
                    const hasImage = !!backgroundImage;
                    
                    return (
                      <div
                        key={featuredLocation.id}
                        className="flex-shrink-0 w-[260px] snap-start rounded-lg shadow-md overflow-hidden bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => {
                          onSelectLocation(featuredLocation);
                          onModeChange('details');
                        }}
                      >
                        <div
                          className="h-32 bg-gray-200 bg-center bg-cover"
                          style={hasImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
                        >
                          {/* Fallback for no image */}
                          {!hasImage && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3">
                          <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">{featuredLocation.name}</h4>
                          
                          {(featuredLocation.placeData?.rating || placesData[featuredLocation.id]?.rating) &&
                           (featuredLocation.placeData?.userRatingsTotal || placesData[featuredLocation.id]?.userRatingsTotal) && (
                            <div className="mb-2 scale-90 origin-left">
                              <RatingDisplay
                                rating={featuredLocation.placeData?.rating || placesData[featuredLocation.id]?.rating}
                                totalRatings={featuredLocation.placeData?.userRatingsTotal || placesData[featuredLocation.id]?.userRatingsTotal}
                                placeId={featuredLocation.id}
                                businessName={featuredLocation.name}
                              />
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1 mt-1">
                            {featuredLocation.types.slice(0, 2).map(type => (
                              <span
                                key={type}
                                className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                                style={{
                                  backgroundColor: activityConfig[type].color + '20',
                                  color: activityConfig[type].color
                                }}
                              >
                                {activityConfig[type].name}
                              </span>
                            ))}
                            {featuredLocation.types.length > 2 && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                +{featuredLocation.types.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {featuredLocations.map((featuredLocation) => {
                    const backgroundImage = getBackgroundImage(featuredLocation);
                    const hasImage = !!backgroundImage;
                    
                    return (
                      <div
                        key={featuredLocation.id}
                        className="rounded-lg shadow-md overflow-hidden bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => {
                          onSelectLocation(featuredLocation);
                          onModeChange('details');
                        }}
                      >
                        <div
                          className="h-40 bg-gray-200 bg-center bg-cover"
                          style={hasImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
                        >
                          {/* Fallback for no image */}
                          {!hasImage && (
                            <div className="h-full flex items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{featuredLocation.name}</h3>
                          
                          {(featuredLocation.placeData?.rating || placesData[featuredLocation.id]?.rating) &&
                           (featuredLocation.placeData?.userRatingsTotal || placesData[featuredLocation.id]?.userRatingsTotal) && (
                            <div className="mb-2">
                              <RatingDisplay
                                rating={featuredLocation.placeData?.rating || placesData[featuredLocation.id]?.rating}
                                totalRatings={featuredLocation.placeData?.userRatingsTotal || placesData[featuredLocation.id]?.userRatingsTotal}
                                placeId={featuredLocation.id}
                                businessName={featuredLocation.name}
                              />
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {featuredLocation.types.map(type => (
                              <span
                                key={type}
                                className="inline-block px-2.5 py-1 text-sm font-medium rounded-full"
                                style={{
                                  backgroundColor: activityConfig[type].color + '20',
                                  color: activityConfig[type].color
                                }}
                              >
                                {activityConfig[type].name}
                              </span>
                            ))}
                          </div>
                          
                          <p className="text-gray-600 mt-2 line-clamp-2 text-sm">
                            {featuredLocation.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* LOCATION DETAILS VIEW */}
        {mode === 'details' && location && (
          <>
            {/* Header - Fixed at top */}
            <div 
              ref={headerRef}
              className={`flex-shrink-0 bg-white border-b ${isExpanded ? 'sticky top-0 z-10' : ''}`}
            >
              <div className="flex flex-col p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{location.name}</h2>
                    {mergedPlaceData?.rating && mergedPlaceData.userRatingsTotal && (
                      <div className="mt-2">
                        <RatingDisplay
                          rating={mergedPlaceData.rating}
                          totalRatings={mergedPlaceData.userRatingsTotal}
                          placeId={location.id}
                          businessName={location.name}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {location.types.map(type => (
                        <span
                          key={type}
                          className="inline-block px-3 py-1.5 text-sm font-medium rounded-full"
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
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>

                {/* Action Buttons - Show at top on mobile */}
                <div className="md:hidden">
                  <ActionButtons />
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
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
      </div>
      
      {/* Report Issue Modal */}
      {location && mode === 'details' && (
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

export default UnifiedDrawer;