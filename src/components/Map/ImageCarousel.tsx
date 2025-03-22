import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { addUtmParams, trackExternalLink, trackPhotoInteraction } from '../../utils/analytics';

interface ImageCarouselProps {
  photos?: google.maps.places.PlacePhoto[] | undefined;
  photoUrls?: string[] | undefined;
  storedPhotoUrls?: string[] | undefined; // Firebase Storage URLs
  businessName: string;
  placeId?: string;
}

const STATIC_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=1600', // Kids playing sports
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600', // Children reading/learning
  'https://images.unsplash.com/photo-1445633629932-0029acc44e88?q=80&w=1600', // Kids in music class
  'https://images.unsplash.com/photo-1517164850305-99a27ae571ee?q=80&w=1600', // Family hiking/outdoors
];

// Maximum number of photos to display
const MAX_PHOTOS = 10;

const ImageCarousel: React.FC<ImageCarouselProps> = ({ photos, photoUrls, storedPhotoUrls, businessName, placeId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedUrls, setDisplayedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const unmountedRef = useRef(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Touch gesture handling refs
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const minSwipeDistance = 50; // Minimum distance required for a swipe
  const isTouchActiveRef = useRef(false); // Track if we're in an active touch sequence

  // Get actual image count (stored photos or fallbacks)
  const actualImageCount = useFallback
    ? Math.min(5, STATIC_FALLBACK_IMAGES.length)
    : (storedPhotoUrls?.length || 0);
  
  // Limit to MAX_PHOTOS
  const photoCount = Math.min(actualImageCount, MAX_PHOTOS);
  
  // Always add a "View more" slide if we have any photos and a place ID
  const hasViewMoreSlide = photoCount > 0 && placeId;
  
  // Total number of slides including the "View more" slide
  const totalSlides = hasViewMoreSlide ? photoCount + 1 : photoCount;

  // Navigate through carousel
  const nextPhoto = useCallback(() => {
    if (totalSlides <= 1) return;
    const newIndex = (currentIndex + 1) % totalSlides;
    setCurrentIndex(newIndex);
    
    // Track photo navigation
    if (newIndex !== photoCount) { // Don't track when moving to "View more" slide
      trackPhotoInteraction(
        'swipe',
        businessName,
        placeId,
        newIndex,
        photoCount
      );
    }
  }, [totalSlides, currentIndex, photoCount, businessName, placeId]);

  const prevPhoto = useCallback(() => {
    if (totalSlides <= 1) return;
    const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    setCurrentIndex(newIndex);
    
    // Track photo navigation
    if (newIndex !== photoCount) { // Don't track when moving to "View more" slide
      trackPhotoInteraction(
        'swipe',
        businessName,
        placeId,
        newIndex,
        photoCount
      );
    }
  }, [totalSlides, currentIndex, photoCount, businessName, placeId]);

  // Clean up on unmount
  useEffect(() => {
    // Initialize unmounted ref properly
    unmountedRef.current = false;
    
    return () => {
      unmountedRef.current = true;
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPhoto, prevPhoto]);

  // Set up displayed URLs from storedPhotoUrls, or use fallbacks if needed
  useEffect(() => {
    // Reset when photos or photoUrls change
    setError(null);
    setIsLoading(true);
    
    // Clear any existing timeout to prevent memory leaks
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    
    // Only start loading process if component is mounted
    if (unmountedRef.current) return;
    
    // Set a loading timeout to show fallback after waiting too long
    loadingTimerRef.current = setTimeout(() => {
      if (unmountedRef.current) return;
      setError("Photos couldn't be loaded");
      setUseFallback(true);
      setIsLoading(false);
    }, 5000); // 5 seconds timeout

    // Use permanent stored URLs - these are the primary source now
    if (storedPhotoUrls && storedPhotoUrls.length > 0) {
      // Limit to MAX_PHOTOS
      setDisplayedUrls(storedPhotoUrls.slice(0, MAX_PHOTOS));
      setIsLoading(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      return;
    }

    // Case 2: If no storedPhotoUrls are available, use fallbacks immediately
    if ((!storedPhotoUrls || storedPhotoUrls.length === 0) && !unmountedRef.current) {
      setUseFallback(true);
      setIsLoading(false);
      
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
    
    // Cleanup function
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [storedPhotoUrls]);

  // Use fallback images if needed
  useEffect(() => {
    if (useFallback) {
      setDisplayedUrls(STATIC_FALLBACK_IMAGES);
      setIsLoading(false);
    }
  }, [useFallback]);

  // Handle image load
  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
    
    // Track successful image view (first view only, not on every render)
    if (isLoading && currentIndex !== photoCount) { // Don't track for "View more" slide
      trackPhotoInteraction(
        'view',
        businessName,
        placeId,
        currentIndex,
        photoCount
      );
    }
  };

  // Handle image error - simplified, no refresh logic
  const handleCarouselImageError = () => {
    // Track the error event
    trackPhotoInteraction(
      'error',
      businessName,
      placeId,
      currentIndex,
      photoCount,
      `Failed to load image at index ${currentIndex}`
    );
    
    // If one image fails but we have others, don't set global error yet
    if (displayedUrls.length > 1) {
      // Try the next image
      nextPhoto();
    } else {
      setError("Couldn't load photo");
      setUseFallback(true);
    }
  };
  
  // Handle clicking the "View more photos" slide
  const handleViewMoreClick = () => {
    if (!placeId) return;
    
    const baseUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}&query_place_id=${placeId}`;
    const url = addUtmParams(baseUrl);
    
    // Enhanced tracking with location ID and source
    trackExternalLink(
      'photos',
      businessName,
      url,
      placeId,
      'detail'
    );
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single-finger touches
    if (e.touches.length !== 1) return;
    
    // Store the initial touch position
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
    isTouchActiveRef.current = true;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Skip if we're not in an active touch sequence
    if (!isTouchActiveRef.current) return;
    
    // Update current touch position
    touchEndXRef.current = e.touches[0].clientX;
    
    // Calculate difference
    const deltaX = touchEndXRef.current - (touchStartXRef.current || 0);
    
    // If horizontal movement is significant (> 10px), prevent page scrolling
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Skip if we're not in an active touch sequence
    if (!isTouchActiveRef.current) return;
    
    // Reset touch active state
    isTouchActiveRef.current = false;
    
    // Skip if we don't have start and end positions
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    
    // Calculate swipe distance
    const deltaX = touchEndXRef.current - touchStartXRef.current;
    
    // Check if we're on the "View more" slide
    const isOnViewMoreSlide = hasViewMoreSlide && currentIndex === photoCount;
    
    // If the swipe distance exceeds our minimum threshold, change the photo
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swiped right (previous photo)
        // Always allow going back to previous photos, even from "View more" slide
        prevPhoto();
      } else if (!isOnViewMoreSlide) {
        // Swiped left (next photo)
        // Only allow advancing forward if we're not on the "View more" slide
        nextPhoto();
      }
      // If on "View more" slide and swiping left, do nothing (we're at the end)
    }
    
    // Reset touch positions
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }, [nextPhoto, prevPhoto, hasViewMoreSlide, currentIndex, photoCount]);

  // No images available
  if ((totalSlides === 0 || (!displayedUrls.length && !isLoading)) && !useFallback) {
    return (
      <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-400">
          <ImageIcon size={40} strokeWidth={1.5} />
          <span className="mt-2">No photos available</span>
        </div>
      </div>
    );
  }

  // Check if we're on the "View more" slide
  const isViewMoreSlide = hasViewMoreSlide && currentIndex === photoCount;

  // Get the current image URL (if not on "View more" slide)
  const currentImageUrl = isViewMoreSlide ? null : (
    useFallback
      ? STATIC_FALLBACK_IMAGES[currentIndex % STATIC_FALLBACK_IMAGES.length]
      : displayedUrls[currentIndex % displayedUrls.length]
  );

  return (
    <div
      className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100 group"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {/* Loading state */}
      {isLoading && !isViewMoreSlide && (
        <div className="absolute inset-0 flex items-center justify-center z-carousel-loading bg-black/10">
          <div className="flex flex-col items-center bg-white/80 p-4 rounded-lg">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="mt-2 text-gray-700 font-medium">Loading photo...</span>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && !isLoading && !useFallback && !isViewMoreSlide && (
        <div className="absolute inset-0 flex items-center justify-center z-carousel-error">
          <div className="text-center bg-white p-4 rounded-lg shadow-md">
            <p className="text-gray-700 mb-3">{error}</p>
          </div>
        </div>
      )}
      
      {/* Fallback message (only show when using fallbacks) */}
      {useFallback && !isViewMoreSlide && (
        <div className="absolute top-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center z-carousel-fallback-message">
          Using placeholder images
        </div>
      )}
      
      {/* "View more photos" slide */}
      {isViewMoreSlide ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-blue-700 cursor-pointer"
          onClick={handleViewMoreClick}
        >
          <div className="text-center text-white p-4">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">More photos...</h3>
            <button
              className="px-6 py-3 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2 mx-auto"
            >
              View on Google Maps <ExternalLink size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Regular photo display */
        currentImageUrl && (
          <img
            src={currentImageUrl}
            alt={`${businessName} ${currentIndex + 1}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-20' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={() => {
              console.warn(`Image loading error for carousel: ${businessName}`);
              handleCarouselImageError();
            }}
            referrerPolicy="no-referrer"
            loading="eager"
          />
        )
      )}
      
      {/* Photo count indicator */}
      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-sm rounded z-carousel-counter">
        {currentIndex + 1}/{totalSlides}
      </div>
      
      {/* Navigation buttons - only show if we have multiple slides */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-carousel-controls"
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-carousel-controls"
            aria-label="Next photo"
          >
            <ChevronRight size={24} />
          </button>

          {/* Photo indicator dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-carousel-indicators">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  
                  // Only track when selecting a photo (not the "View more" slide)
                  if (index !== photoCount) {
                    trackPhotoInteraction(
                      'swipe',
                      businessName,
                      placeId,
                      index,
                      photoCount
                    );
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white scale-125' : 'bg-white/50'
                }`}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(ImageCarousel);