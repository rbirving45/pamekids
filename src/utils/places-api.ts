// Handles interaction with the Google Maps Places API
// Functions to fetch place details, photos, and other information

// Cache constants
const CACHE_KEYS = {
  PLACE_DETAILS_PREFIX: 'pamekids_place_',
  CACHE_VERSION: 'pamekids_cache_version'
};
const CACHE_VERSION = '1.0'; // Increment when data structure changes
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const PHOTO_URL_EXPIRATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days - Google photo URLs typically expire in 3-7 days

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
      
      // Check if photo URLs might be expired
      const photoUrlsExpired = shouldRefreshPhotos(placeId, cachedData.data);
      
      // If cache is fresh and photos aren't expired, use it
      if (cacheAge < CACHE_EXPIRATION_MS && !photoUrlsExpired) {
        console.log(`Using cached place details for ${placeId} (age: ${Math.round(cacheAge/60000)}m)`);
        
        // Create a response with photos property that has getUrl method
        // This is crucial because components expect this method
        const response = {...cachedData.data};
        
        // Handle photoUrls separately since they're strings
        response.photoUrls = cachedData.photoUrls;
        
        // Fetch fresh data in background if older than 6 hours but still valid
        if (cacheAge > 6 * 60 * 60 * 1000) {
          console.log('Place cache is aging, refreshing in background...');
          setTimeout(() => {
            fetchPlaceDetails(placeId, maps, true)
              .catch(err => console.error('Background place refresh error:', err));
          }, 2000); // Delay to avoid competing with critical resources
        }
        
        return Promise.resolve(response);
      } else if (photoUrlsExpired && !forceRefresh) {
        // If only the photo URLs are expired but other data is fine, use a targeted approach
        console.log(`Photo URLs likely expired for ${placeId}, fetching fresh photo data...`);
        
        // Return cached data for immediate display, but trigger background refresh
        const response = {...cachedData.data};
        response.photoUrls = cachedData.photoUrls;
        
        // Trigger immediate background refresh
        setTimeout(() => {
          fetchPlaceDetails(placeId, maps, true)
            .catch(err => console.error('Background photo refresh error:', err));
        }, 100);
        
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
      
      console.log(`Fetching place details for ${placeId} from Google Places API...`);
      
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
            'geometry',
            'reviews'
          ]
        },
        (result, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && result) {
            // Log reviews if available
            if (result.reviews && result.reviews.length > 0) {
              console.log(`Found ${result.reviews.length} reviews for place ${placeId}`);
              console.log('First review sample:', result.reviews[0].text.substring(0, 100) + '...');
            } else {
              console.log(`No reviews found for place ${placeId}`);
            }
            
            // Process photos if available
            let photoUrls: string[] = [];
            
            if (result.photos && result.photos.length > 0) {
              try {
                // Try different size options to maximize success rate
                // Get up to 10 photo URLs with multiple sizing attempts
                photoUrls = result.photos
                  .slice(0, 10)
                  .map(photo => {
                    try {
                      // First try with maxHeight and maxWidth
                      const url = photo.getUrl({ maxHeight: 500, maxWidth: 800 });
                      return url;
                    } catch (e) {
                      // If that fails, try with just maxWidth
                      console.warn('First attempt failed for photo URL, trying alternate method');
                      try {
                        const url = photo.getUrl({ maxWidth: 600 });
                        return url;
                      } catch (e2) {
                        console.warn('Error fetching photo URL for place ' + placeId, e2);
                        return null;
                      }
                    }
                  })
                  .filter(Boolean) as string[];
                
                // Log photo extraction results
                if (photoUrls.length > 0) {
                  console.log(`Successfully extracted ${photoUrls.length} photos for place ${placeId}`);
                } else {
                  console.warn(`Failed to extract any photo URLs for place ${placeId} despite having ${result.photos.length} photos`);
                }
              } catch (photoError) {
                console.error(`Error processing photos for place ${placeId}:`, photoError);
              }
            } else {
              console.log(`No photos available for place ${placeId}`);
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
              reviews: result.reviews || [], // Explicitly include reviews
              last_fetched: new Date().toISOString() // Add timestamp
            };
            
            // Debug log to verify reviews are in the placeData object
            console.log(`Reviews in placeData object: ${placeData.reviews ? placeData.reviews.length : 0}`);
            
            // Cache the response
            savePlaceDetailsToCache(placeId, placeData, photoUrls);
            
            // If we have photo URLs, update Firebase data in the background
            if (photoUrls.length > 0) {
              // Import and use updateLocationPlaceData without blocking main flow
              import('./firebase-service').then(service => {
                if (typeof service.updateLocationPlaceData === 'function') {
                  // Update in the background, but don't wait for result
                  service.updateLocationPlaceData(placeId, placeData)
                    .then(updated => {
                      if (updated) {
                        console.log(`Successfully saved ${photoUrls.length} photos to Firebase for place ${placeId}`);
                      }
                    })
                    .catch(err => {
                      console.warn(`Background Firebase photo update failed for ${placeId}`, err);
                    });
                }
              }).catch(err => {
                console.warn('Failed to import firebase-service module:', err);
              });
            } else {
              // Even with no photos, we might want to update other data like ratings
              import('./firebase-service').then(service => {
                if (typeof service.updateLocationPlaceData === 'function') {
                  // Still update ratings and other data even without photos
                  service.updateLocationPlaceData(placeId, placeData)
                    .catch(err => {
                      console.warn(`Background Firebase data update failed for ${placeId}`, err);
                    });
                }
              }).catch(err => {
                console.warn('Failed to import firebase-service module:', err);
              });
            }
            
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
 * Checks if the photo URLs for a place might be expired and need refreshing
 * @param placeId - The Google Maps Place ID
 * @param placeData - Optional place data object to check
 * @returns Boolean indicating if photos should be refreshed
 */
export function shouldRefreshPhotos(placeId: string, placeData?: any): boolean {
  // If no place data or no last_fetched timestamp, we should refresh
  if (!placeData || !placeData.last_fetched) {
    return true;
  }

  try {
    // Parse the last_fetched timestamp
    const lastFetchedTime = new Date(placeData.last_fetched).getTime();
    
    // Check if it's been more than PHOTO_URL_EXPIRATION_MS since the last fetch
    const photoAge = Date.now() - lastFetchedTime;
    
    // Return true if photos are older than expiration time
    return photoAge > PHOTO_URL_EXPIRATION_MS;
  } catch (error) {
    console.warn(`Error checking photo expiration for ${placeId}:`, error);
    // If there's any error parsing the timestamp, assume we should refresh
    return true;
  }
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
  extractPlaceIdFromUrl,
  shouldRefreshPhotos
};

export default placesApi;