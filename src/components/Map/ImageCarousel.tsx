import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCcw, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { addUtmParams, trackExternalLink } from '../../utils/analytics';
import { handleImageError } from '../../utils/image-refresh-service';

interface ImageCarouselProps {
  photos?: google.maps.places.PlacePhoto[] | undefined;
  photoUrls?: string[] | undefined;
  businessName: string;
  placeId?: string;
}

const STATIC_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=1000',
  'https://images.unsplash.com/photo-1468234560892-6b6a8a72594f?q=80&w=1000',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1000',
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000',
  'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?q=80&w=1000',
];

// Maximum number of photos to display
const MAX_PHOTOS = 10;

const ImageCarousel: React.FC<ImageCarouselProps> = ({ photos, photoUrls, businessName, placeId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedUrls, setDisplayedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const unmountedRef = useRef(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Touch gesture handling refs
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const minSwipeDistance = 50; // Minimum distance required for a swipe
  const isTouchActiveRef = useRef(false); // Track if we're in an active touch sequence

  // Get actual image count (photos or fallbacks)
  const actualImageCount = useFallback
    ? Math.min(5, STATIC_FALLBACK_IMAGES.length)
    : Math.max((photos?.length || 0), (photoUrls?.length || 0));
  
  // Limit to MAX_PHOTOS
  const photoCount = Math.min(actualImageCount, MAX_PHOTOS);
  
  // Always add a "View more" slide if we have any photos and a place ID
  // This ensures users can always click through to Google Maps for more photos
  const hasViewMoreSlide = photoCount > 0 && placeId;
  
  // Total number of slides including the "View more" slide
  const totalSlides = hasViewMoreSlide ? photoCount + 1 : photoCount;

  // Navigate through carousel
  const nextPhoto = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevPhoto = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

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

  // Get URLs from Google Photos objects or from static fallbacks
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

    // Case 1: Use photoUrls if available (these are pre-loaded URLs)
    if (photoUrls && photoUrls.length > 0) {
      // Limit to MAX_PHOTOS
      setDisplayedUrls(photoUrls.slice(0, MAX_PHOTOS));
      setIsLoading(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      return;
    }
    
    // Case 2: Create URLs from photo objects
    if (photos && photos.length > 0) {
      try {
        // Get URLs from photo objects - limit to MAX_PHOTOS to avoid unnecessary work
        const urls = photos
          .slice(0, MAX_PHOTOS) // Limit before processing
          .filter(photo => photo && typeof photo.getUrl === 'function')
          .map(photo => {
            try {
              // Use the most reliable size
              return photo.getUrl({ maxHeight: 500, maxWidth: 800 });
            } catch (e) {
              console.warn('Error getting photo URL', e);
              return null;
            }
          })
          .filter((url): url is string => Boolean(url));
        
        if (urls.length > 0 && !unmountedRef.current) {
          setDisplayedUrls(urls);
          setIsLoading(false);
          
          if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
          return;
        }
      } catch (e) {
        console.error('Failed to get photo URLs:', e);
      }
    }
    
    // Case 3: If no photoUrls or photos are available, use fallbacks immediately
    if ((!photoUrls || photoUrls.length === 0) && (!photos || photos.length === 0) && !unmountedRef.current) {
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
  }, [photos, photoUrls]);

  // Use fallback images if needed
  useEffect(() => {
    if (useFallback) {
      setDisplayedUrls(STATIC_FALLBACK_IMAGES);
      setIsLoading(false);
    }
  }, [useFallback]);

  // Handle retry button click
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setUseFallback(false);
    
    // If we have photoUrls, use them directly
    if (photoUrls && photoUrls.length > 0) {
      setDisplayedUrls(photoUrls.slice(0, MAX_PHOTOS));
      setIsLoading(false);
      return;
    }
    
    // If we have photos, try to get URLs again
    if (photos && photos.length > 0) {
      try {
        const urls = photos
          .slice(0, MAX_PHOTOS) // Limit before processing
          .filter(photo => photo && typeof photo.getUrl === 'function')
          .map(photo => {
            try {
              // Try a different size than the original attempt
              return photo.getUrl({ maxWidth: 600, maxHeight: 400 });
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean) as string[];
        
        if (urls.length > 0) {
          setDisplayedUrls(urls);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Retry failed:', e);
      }
    }
    
    // If we still can't get photos, use fallback
    setUseFallback(true);
    setIsLoading(false);
  }, [photos, photoUrls]);

  // Handle image load
  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  // Handle image error
  const handleCarouselImageError = (failedUrl: string) => {
    // If one image fails but we have others, don't set global error yet
    if (displayedUrls.length > 1) {
      // Try the next image
      nextPhoto();
    } else {
      setError("Couldn't load photo");
      
      // Only switch to fallback if we aren't already using fallbacks and not currently refreshing
      if (!useFallback && !isRefreshing) {
        setUseFallback(true);
      }
    }
    
    // If we have a place ID, try to refresh the images
    if (placeId && !isRefreshing) {
      setIsRefreshing(true);
      
      // Use our image refresh service
      handleImageError(
        placeId,
        businessName,
        failedUrl,
        () => {
          // On successful refresh, clear error states and try to load the images again
          console.log(`Images refreshed successfully for ${businessName}, reloading carousel`);
          setError(null);
          setUseFallback(false);
          setIsRefreshing(false);
          
          // Refetch the photo URLs
          // We'll use a custom event to notify parent components that photos have been refreshed
          const refreshEvent = new CustomEvent('photos-refreshed', {
            detail: { placeId, businessName }
          });
          window.dispatchEvent(refreshEvent);
          
          // Reset loading and try to load fresh URLs after a small delay
          setTimeout(() => {
            // This will trigger a re-render that should use the newly refreshed URLs
            setDisplayedUrls([]);
            setIsLoading(true);
          }, 500);
        }
      ).catch(err => {
        console.error('Error handling image refresh:', err);
        setIsRefreshing(false);
      });
    }
  };
  
  // Handle clicking the "View more photos" slide
  const handleViewMoreClick = () => {
    if (!placeId) return;
    
    const baseUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}&query_place_id=${placeId}`;
    const url = addUtmParams(baseUrl);
    trackExternalLink('photos', businessName, url);
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Background refreshes are now handled by the scheduled server process
    // We'll implement a mechanism for reporting broken images in the future
  };
  
  // Keep the effect without using maybeRefreshPhotosInBackground
  useEffect(() => {
    // This is now a no-op, but we'll implement image URL refresh logic here later
    if (placeId && (photos?.length || photoUrls?.length)) {
      // No automatic refresh for now
      // We'll implement a proper mechanism for handling expired URLs in the future
      console.log('Images loaded - background refresh disabled');
    }
  }, [placeId, photos, photoUrls]);
  
  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single-finger touches
    if (e.touches.length !== 1) return;
    
    // Don't start new touch sequence if we're on the "View more" slide
    // We'll check this condition dynamically inside the handler instead of using a dependency
    if (hasViewMoreSlide && currentIndex === photoCount) return;
    
    // Store the initial touch position
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
    isTouchActiveRef.current = true;
    
    // Don't stop propagation - allow event bubbling to parent components
  }, [hasViewMoreSlide, currentIndex, photoCount]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Skip if we're not in an active touch sequence
    if (!isTouchActiveRef.current) return;
    
    // Update current touch position
    touchEndXRef.current = e.touches[0].clientX;
    
    // Calculate difference
    const deltaX = touchEndXRef.current - (touchStartXRef.current || 0);
    
    // If horizontal movement is significant (> 10px), prevent page scrolling
    // This ensures users can swipe the carousel without scrolling the page
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
    
    // If the swipe distance exceeds our minimum threshold, change the photo
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swiped right (previous photo)
        prevPhoto();
      } else {
        // Swiped left (next photo)
        nextPhoto();
      }
    }
    
    // Reset touch positions
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }, [nextPhoto, prevPhoto]);

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
      
      {/* Error state with retry button */}
      {error && !isLoading && !useFallback && !isViewMoreSlide && (
        <div className="absolute inset-0 flex items-center justify-center z-carousel-error">
          <div className="text-center bg-white p-4 rounded-lg shadow-md">
            <p className="text-gray-700 mb-3">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center"
                disabled={isRefreshing}
              >
                <RefreshCcw size={16} className="mr-2" />
                Retry
              </button>
              
              {placeId && (
                <button
                  onClick={() => {
                    if (currentImageUrl) {
                      // Call our image refresh service with the current URL
                      setIsRefreshing(true);
                      handleImageError(
                        placeId,
                        businessName,
                        currentImageUrl,
                        () => {
                          // On success
                          setError(null);
                          setUseFallback(false);
                          setIsRefreshing(false);
                          
                          // Trigger reload of images
                          setDisplayedUrls([]);
                          setIsLoading(true);
                          
                          // Notify parent components
                          const refreshEvent = new CustomEvent('photos-refreshed', {
                            detail: { placeId, businessName }
                          });
                          window.dispatchEvent(refreshEvent);
                        }
                      ).catch(() => {
                        setIsRefreshing(false);
                      });
                    }
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Refresh Images
                    </>
                  )}
                </button>
              )}
            </div>
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
            onError={(e) => {
              // Get the failed URL
              const failedUrl = (e.target as HTMLImageElement).src;
              console.warn(`Image loading error for carousel: ${businessName}`, e);
              
              // Call our updated error handler with the failed URL
              handleCarouselImageError(failedUrl);
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
                onClick={() => setCurrentIndex(index)}
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