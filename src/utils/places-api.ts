import { Location } from '../data/locations';

// ===== Type Definitions =====
export interface PlaceData {
  rating?: number;
  userRatingsTotal?: number;
  photos?: google.maps.places.PlacePhoto[];
  photoUrls?: string[];
  photoCount?: number;
}

// Simple localStorage cache for places data
interface CacheEntry {
  timestamp: number;
  data: PlaceData;
}

// ===== Cache Constants =====
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const PLACES_CACHE_KEY = 'places_data_cache_v2';

// ===== Basic Cache Functions =====

/**
 * Saves a place to the cache
 */
const savePlaceToCache = (placeId: string, data: PlaceData): void => {
  try {
    // Get existing cache
    const cacheString = localStorage.getItem(PLACES_CACHE_KEY);
    const cache: Record<string, CacheEntry> = cacheString ? JSON.parse(cacheString) : {};
    
    // Add/update this entry
    cache[placeId] = {
      timestamp: Date.now(),
      data: {
        rating: data.rating,
        userRatingsTotal: data.userRatingsTotal,
        // We don't cache photo objects or URLs - they're not serializable or expire quickly
        photoCount: data.photoCount || data.photos?.length || 0
      }
    };
    
    // Save cache back to localStorage
    localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save place to cache:', error);
    // Clear cache if it's corrupted
    try {
      localStorage.removeItem(PLACES_CACHE_KEY);
    } catch {}
  }
};

/**
 * Gets a place from the cache if available and not expired
 */
const getPlaceFromCache = (placeId: string): PlaceData | null => {
  try {
    const cacheString = localStorage.getItem(PLACES_CACHE_KEY);
    if (!cacheString) return null;
    
    const cache: Record<string, CacheEntry> = JSON.parse(cacheString);
    const entry = cache[placeId];
    
    // Check if we have a cache entry and it's not expired
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get place from cache:', error);
    return null;
  }
};

/**
 * Clears expired entries from the cache
 */
const cleanupCache = (): void => {
  try {
    const cacheString = localStorage.getItem(PLACES_CACHE_KEY);
    if (!cacheString) return;
    
    const cache: Record<string, CacheEntry> = JSON.parse(cacheString);
    const now = Date.now();
    let hasChanges = false;
    
    // Check each entry
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > CACHE_DURATION) {
        delete cache[key];
        hasChanges = true;
      }
    });
    
    // Only write back if we made changes
    if (hasChanges) {
      localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.warn('Failed to clean up cache:', error);
  }
};

// Run cache cleanup on module load
cleanupCache();

// ===== Photo Handling =====

/**
 * Gets URLs for photos using a reliable approach with multiple fallbacks
 */
export const getPhotoUrls = (photos: google.maps.places.PlacePhoto[] | undefined, count: number = 5): string[] => {
  if (!photos || photos.length === 0) return [];
  
  const urls: string[] = [];
  const validPhotos = photos.filter(photo => photo && typeof photo.getUrl === 'function');
  
  if (validPhotos.length === 0) return [];
  
  // Different size configurations to try in order of preference
  const sizeOptions = [
    { maxWidth: 800, maxHeight: 600 },
    { maxHeight: 500 },
    { maxWidth: 640 },
    { maxWidth: 400 }, // Smaller fallback sizes
    { maxHeight: 300 },
    {} // Default size as final fallback
  ];
  
  // Try to get at least 'count' photos
  for (let i = 0; i < Math.min(validPhotos.length, count); i++) {
    let foundUrl = false;
    
    try {
      // Use the first size option that works
      for (const sizeOption of sizeOptions) {
        try {
          const url = validPhotos[i].getUrl(sizeOption);
          if (url) {
            // Add a cache buster to prevent caching issues
            const cacheBuster = `cb=${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
            const separator = url.includes('?') ? '&' : '?';
            urls.push(`${url}${separator}${cacheBuster}`);
            foundUrl = true;
            break; // Found a working size for this photo
          }
        } catch (sizeError) {
          // Try next size option
          continue;
        }
      }
      
      // If no size options worked, try one more time with a simple approach
      if (!foundUrl && validPhotos[i]) {
        try {
          // Last resort - try without size options
          const url = validPhotos[i].getUrl({});
          if (url) {
            urls.push(url);
          }
        } catch (fallbackError) {
          console.warn(`Could not get any URL for photo ${i}`);
        }
      }
    } catch (e) {
      console.warn(`Failed to process photo ${i}:`, e);
    }
  }
  
  return urls;
};

// ===== Place Details Fetching =====

/**
 * Fetches place details from Google Places API with simplified approach
 */
export const fetchPlaceDetails = async (
  placeId: string,
  maps: typeof google.maps
): Promise<PlaceData | undefined> => {
  try {
    // Create a temporary map div for PlacesService
    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);

    const service = new maps.places.PlacesService(mapDiv);

    // Define the request
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      fields: [
        'rating',
        'user_ratings_total',
        'photos',
        'name',
        'formatted_address',
        'place_id',
        'geometry'
      ],
    };

    return new Promise((resolve, reject) => {
      service.getDetails(request, async (result, status) => {
        try {
          // Clean up temporary div
          document.body.removeChild(mapDiv);
          
          if (status === maps.places.PlacesServiceStatus.OK && result) {
            // Get valid photos
            const photos = result.photos?.filter(photo =>
              photo && typeof photo.getUrl === 'function'
            ) || [];
            
            // Generate some photo URLs upfront
            const photoUrls = getPhotoUrls(photos, 5);
              
            // Create place data object
            const placeData: PlaceData = {
              rating: result.rating,
              userRatingsTotal: result.user_ratings_total,
              photos: photos,
              photoUrls: photoUrls,
              photoCount: photos.length
            };
            
            // Save to cache (ratings only, not photos)
            savePlaceToCache(placeId, placeData);
            
            resolve(placeData);
          } else if (status === maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
            console.warn('Google Places API query limit reached. Using cached data if available.');
            
            // Try to get from cache
            const cachedData = getPlaceFromCache(placeId);
            resolve(cachedData || undefined);
          } else {
            console.error('Places API error:', status);
            
            // Try to get from cache as fallback
            const cachedData = getPlaceFromCache(placeId);
            resolve(cachedData || undefined);
          }
        } catch (innerError) {
          console.error('Error in Places API callback:', innerError);
          reject(innerError);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    
    // Last resort - check cache
    const cachedData = getPlaceFromCache(placeId);
    return cachedData || undefined;
  }
};