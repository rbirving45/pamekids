// Handles interaction with the Google Maps Places API
// Functions to fetch place details, photos, and other information

// Cache constants
const CACHE_KEYS = {
  PLACE_DETAILS_PREFIX: 'pamekids_place_',
  CACHE_VERSION: 'pamekids_cache_version'
};
const CACHE_VERSION = '1.0'; // Increment when data structure changes
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Type for the cached place data
interface CachedPlaceData {
  data: any;
  timestamp: number;
  photoUrls: string[];
}

// Helper to get cached place details
const getCachedPlaceDetails = (placeId: string): CachedPlaceData | null => {
  try {
    // Check cache version
    const cacheVersion = localStorage.getItem(CACHE_KEYS.CACHE_VERSION);
    if (cacheVersion !== CACHE_VERSION) {
      // Clear all place caches if version doesn't match
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.PLACE_DETAILS_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
      return null;
    }
    
    const key = `${CACHE_KEYS.PLACE_DETAILS_PREFIX}${placeId}`;
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;
    
    return JSON.parse(cachedData) as CachedPlaceData;
  } catch (error) {
    console.warn('Error reading place details from cache:', error);
    return null;
  }
};

// Helper to save place details to cache
const savePlaceDetailsToCache = (placeId: string, data: any, photoUrls: string[]) => {
  try {
    const key = `${CACHE_KEYS.PLACE_DETAILS_PREFIX}${placeId}`;
    const cacheData: CachedPlaceData = {
      data,
      timestamp: Date.now(),
      photoUrls
    };
    
    // Set cache version
    localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
    
    // Store place data
    localStorage.setItem(key, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.warn('Error saving place details to cache:', error);
    return false;
  }
};

/**
 * Fetches place details from Google Maps Places API
 * @param placeId - The Google Maps Place ID
 * @param maps - Google Maps API instance
 * @param forceRefresh - Force refresh from API even if cache exists
 * @returns Promise with place data
 */
export async function fetchPlaceDetails(
  placeId: string,
  maps: typeof google.maps,
  forceRefresh: boolean = false
): Promise<any> {
  if (!placeId || !maps) {
    return Promise.reject(new Error('Missing placeId or maps instance'));
  }
  
  // First check cache if not forcing refresh
  if (!forceRefresh) {
    const cachedData = getCachedPlaceDetails(placeId);
    
    if (cachedData) {
      const cacheAge = Date.now() - cachedData.timestamp;
      
      // If cache is fresh (less than 24 hours), use it
      if (cacheAge < CACHE_EXPIRATION_MS) {
        console.log(`Using cached place details for ${placeId} (age: ${Math.round(cacheAge/60000)}m)`);
        
        // Create a response with photos property that has getUrl method
        // This is crucial because components expect this method
        const response = {...cachedData.data};
        
        // Handle photoUrls separately since they're strings
        response.photoUrls = cachedData.photoUrls;
        
        // Fetch fresh data in background if older than 6 hours but still valid
        if (cacheAge > 6 * 60 * 60 * 1000) {
          console.log('Place cache is valid but aging, refreshing in background...');
          setTimeout(() => {
            fetchPlaceDetails(placeId, maps, true)
              .catch(err => console.error('Background place refresh error:', err));
          }, 2000); // Delay to avoid competing with critical resources
        }
        
        return Promise.resolve(response);
      } else {
        console.log(`Place cache expired for ${placeId}, fetching fresh data...`);
      }
    }
  }

  // No valid cache or force refresh, fetch from API
  return new Promise((resolve, reject) => {
    try {
      // Create a Places service instance
      const service = new maps.places.PlacesService(document.createElement('div'));
      
      // Request place details
      service.getDetails(
        {
          placeId,
          fields: [
            'name',
            'formatted_address',
            'rating',
            'user_ratings_total',
            'formatted_phone_number',
            'website',
            'opening_hours',
            'photos',
            'geometry'
          ]
        },
        (result, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && result) {
            // Process photos if available
            let photoUrls: string[] = [];
            
            if (result.photos && result.photos.length > 0) {
              // Get up to 5 photo URLs
              photoUrls = result.photos
                .slice(0, 5)
                .map(photo => {
                  try {
                    return photo.getUrl({ maxHeight: 500, maxWidth: 800 });
                  } catch (e) {
                    console.warn('Error fetching photo URL', e);
                    return null;
                  }
                })
                .filter(Boolean) as string[];
            }
            
            // Format opening hours
            let formattedHours: Record<string, string> = {};
            if (result.opening_hours && result.opening_hours.weekday_text) {
              result.opening_hours.weekday_text.forEach(dayText => {
                // Parse "Day: Hours" format
                const matches = dayText.match(/^([^:]+):\s(.+)$/);
                if (matches && matches.length === 3) {
                  const [, day, hours] = matches;
                  formattedHours[day] = hours;
                }
              });
            }
            
            // Create structured place data
            const placeData = {
              name: result.name,
              address: result.formatted_address,
              phone: result.formatted_phone_number,
              website: result.website,
              rating: result.rating,
              userRatingsTotal: result.user_ratings_total,
              hours: formattedHours,
              photos: result.photos || [],
              photoUrls,
              geometry: result.geometry,
              last_fetched: new Date().toISOString() // Add timestamp
            };
            
            // Cache the response
            savePlaceDetailsToCache(placeId, placeData, photoUrls);
            
            resolve(placeData);
          } else {
            // Common place errors shouldn't crash the app
            console.warn(`Place details fetch failed: ${status}`);
            reject(new Error(`Failed to fetch place details: ${status}`));
          }
        }
      );
    } catch (error) {
      console.error('Error fetching place details:', error);
      reject(error);
    }
  });
}

/**
 * Helper function to extract Place ID from a Google Maps URL
 * @param url - Google Maps URL
 * @returns Place ID or null if not found
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    // Handle various Google Maps URL formats
    const urlObj = new URL(url);
    
    // Extract from query parameter
    const searchParams = urlObj.searchParams;
    if (searchParams.has('place_id')) {
      return searchParams.get('place_id');
    }
    
    // Extract from path format
    const pathMatch = urlObj.pathname.match(/\/place\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return null;
  }
}

// Exported interface for the API
const placesApi = {
  fetchPlaceDetails,
  extractPlaceIdFromUrl
};

export default placesApi;