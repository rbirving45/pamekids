import React, { useState, useEffect, useMemo } from 'react';
import { Location, ActivityType } from '../../types/location';
import { fetchPlaceDetails, shouldRefreshPhotos } from '../../utils/places-api';
import { Star } from 'lucide-react';

interface LocationTileProps {
  location: Location;
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  onSelect: () => void;
}

const LocationTile: React.FC<LocationTileProps> = ({ location, activityConfig, onSelect }) => {
  const [placeData, setPlaceData] = useState<Location['placeData']>();
  // Track loading state for visual feedback
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Reset error state when location changes
  useEffect(() => {
    setImageError(false);
  }, [location.id]);

  // Fetch place data when component mounts or when needed
  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;
    
    const fetchData = async () => {
      // First check: Do we have placeData with valid photoUrls?
      const hasValidPhotos = location.placeData?.photoUrls &&
                             location.placeData.photoUrls.length > 0;
      
      // Second check: Are the photos likely expired?
      const shouldRefresh = shouldRefreshPhotos(location.id, location.placeData);
      
      // Use cached data immediately if we have valid photos and they're not expired
      if (hasValidPhotos && !shouldRefresh) {
        setPlaceData(location.placeData);
        setIsLoading(false);
        return;
      }
      
      // Skip if Google Maps isn't loaded yet
      if (!window.google?.maps) {
        setIsLoading(false);
        return;
      }
      
      // At this point, we either don't have photos or they're expired, so fetch fresh data
      setIsLoading(true);
      
      try {
        // Set forceRefresh to true if existing photos are likely expired
        const forceRefresh = shouldRefresh;
        const data = await fetchPlaceDetails(location.id, window.google.maps, forceRefresh);
        
        // Only update state if the component is still mounted
        if (isMounted && data) {
          // Ensure we have a valid photos array and not undefined
          const validData = {
            ...data,
            photos: data.photos || [],
            photoUrls: data.photoUrls || []
          };
          
          setPlaceData(validData);
          // Update the original location object to avoid refetching
          location.placeData = validData;
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching place details for tile:', error);
          
          // Even if there's an error, use any existing data if available
          if (location.placeData) {
            setPlaceData(location.placeData);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Execute fetch immediately rather than waiting
    fetchData();
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [location, location.id]);

  // Combine placeData from state or from location, ensuring we get the most complete data
  const mergedPlaceData = placeData || location.placeData;

  // Get the first available photo URL with more robust error handling
  const featuredImageUrl = useMemo(() => {
    // If image already errored, don't try to show it
    if (imageError) return null;
    
    // Check if photos might be expired
    const photosMightBeExpired = shouldRefreshPhotos(location.id, mergedPlaceData);
    
    // Check for photoUrls first (pre-processed URLs)
    if (mergedPlaceData?.photoUrls && mergedPlaceData.photoUrls.length > 0) {
      // If photos might be expired, flag for background refresh but still use them
      if (photosMightBeExpired) {
        // Schedule a background refresh without blocking UI
        setTimeout(() => {
          if (window.google?.maps) {
            fetchPlaceDetails(location.id, window.google.maps, true)
              .catch(err => console.warn(`Background refresh failed for tile: ${location.name}`, err));
          }
        }, 2000); // Delay to avoid competing with critical resources
      }
      
      // Use the first photo URL even if it might be expired (better than nothing)
      return mergedPlaceData.photoUrls[0];
    }
    
    // Check for raw photo objects as fallback (would need processing)
    if (mergedPlaceData?.photos && mergedPlaceData.photos.length > 0 &&
        typeof mergedPlaceData.photos[0]?.getUrl === 'function') {
      try {
        return mergedPlaceData.photos[0].getUrl({
          maxWidth: 400,
          maxHeight: 400
        });
      } catch (e) {
        console.warn('Error getting photo URL:', e);
      }
    }
    
    return null;
  }, [mergedPlaceData, imageError, location.id, location.name]);

  // Fallback image based on the primary activity type
  const primaryType = location.primaryType || location.types[0];
  const fallbackImageColor = activityConfig[primaryType].color;
  
  // Use initial for fallback
  const initialLetter = location.name.charAt(0).toUpperCase();

  return (
    <div
      className="py-1.5 md:py-2 px-3 md:px-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors duration-150 z-location-tile"
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 md:gap-3">
        {/* Left content - Location info */}
        <div className="flex-1 min-w-0 pr-3 z-location-content">
          {/* Name */}
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-0.5 md:mb-1 line-clamp-1">{location.name}</h3>
          
          {/* Activity Types */}
          <div className="flex flex-wrap gap-1 mb-0.5 md:mb-1">
            {location.types.map(type => (
              <span
                key={type}
                className="inline-block px-1.5 md:px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: activityConfig[type].color + '20',
                  color: activityConfig[type].color
                }}
              >
                {activityConfig[type].name}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
            {/* Age range */}
            <span className="inline-block text-xs text-gray-500 px-1.5 md:px-2 py-0.5 bg-gray-100 rounded-full">
              Ages {location.ageRange.min}-{location.ageRange.max}
            </span>
            
            {/* Full rating display - shown on all devices */}
            {mergedPlaceData?.rating && mergedPlaceData.userRatingsTotal && (
              <div className="flex items-center">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => {
                    const rating = mergedPlaceData.rating || 0;
                    const starFilled = i < Math.floor(rating);
                    const hasHalfStar = i === Math.floor(rating) && rating % 1 >= 0.5;
                    
                    return (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          starFilled || hasHalfStar
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="text-xs text-gray-600 ml-1">
                  {mergedPlaceData.rating.toFixed(1)} ({mergedPlaceData.userRatingsTotal > 1000
                    ? `${Math.floor(mergedPlaceData.userRatingsTotal / 1000)}k`
                    : mergedPlaceData.userRatingsTotal})
                </div>
              </div>
            )}
          </div>
          
          {/* Location description - truncated */}
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-0.5 md:mb-1">{location.description}</p>
        </div>
        
        {/* Right side - Featured image (square with rounded corners) */}
        <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 overflow-hidden rounded-lg bg-gray-100 border border-gray-100 z-location-image">
          {featuredImageUrl ? (
            <img
              src={featuredImageUrl}
              alt={location.name}
              className="w-full h-full object-cover transition-opacity duration-300"
              onLoad={() => {
                // Clear loading state when image loads successfully
                setIsLoading(false);
              }}
              onError={() => {
                console.warn(`Image loading error for: ${location.name}`);
                setImageError(true);
                // Clear loading state on error
                setIsLoading(false);
                
                // If this is the first error, try a background refresh
                if (!imageError && window.google?.maps) {
                  setTimeout(() => {
                    fetchPlaceDetails(location.id, window.google.maps, true)
                      .catch(err => console.warn('Background refresh after error failed:', err));
                  }, 500);
                }
              }}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: fallbackImageColor + '20' }}
            >
              {isLoading ? (
                <div className="animate-pulse w-full h-full bg-gray-200 flex items-center justify-center">
                  <span
                    className="text-3xl font-bold opacity-30"
                    style={{ color: fallbackImageColor }}
                  >
                    {initialLetter}
                  </span>
                </div>
              ) : (
                <span
                  className="text-3xl font-bold"
                  style={{ color: fallbackImageColor }}
                >
                  {initialLetter}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationTile;