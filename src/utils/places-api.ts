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
 * Fetches place details from Firestore (not Google API)
 * @param placeId - The Google Maps Place ID
 * @param maps - Google Maps API instance (kept for compatibility but not used)
 * @param forceRefresh - Force refresh from cache even if it exists
 * @returns Promise with place data
 */
export async function fetchPlaceDetails(
  placeId: string,
  maps?: typeof google.maps, // Keep param for compatibility but don't use it
  forceRefresh: boolean = false
): Promise<any> {
  if (!placeId) {
    return Promise.reject(new Error('Missing placeId'));
  }
  
  // First check cache if not forcing refresh
  if (!forceRefresh) {
    const cachedData = getCachedPlaceDetails(placeId);
    
    if (cachedData) {
      const cacheAge = Date.now() - cachedData.timestamp;
      
      // Use cache if it's less than 24 hours old
      if (cacheAge < CACHE_EXPIRATION_MS) {
        console.log(`Using cached place details for ${placeId} (age: ${Math.round(cacheAge/60000)}m)`);
        return Promise.resolve({...cachedData.data, photoUrls: cachedData.photoUrls});
      }
    }
  }

  // No valid cache, fetch from Firestore (not Google API)
  console.log(`Fetching place details for ${placeId} from Firestore...`);
  
  try {
    // Import dynamically to avoid circular dependencies
    const firebaseService = await import('./firebase-service');
    
    // Get location data from Firestore
    const location = await firebaseService.getLocationById(placeId);
    
    if (!location) {
      throw new Error(`Location not found: ${placeId}`);
    }
    
    // Extract placeData or create empty object if not exists
    const placeData = location.placeData || {};
    
    // Cache the response
    if (placeData.photoUrls && placeData.photoUrls.length > 0) {
      savePlaceDetailsToCache(placeId, placeData, placeData.photoUrls);
    }
    
    return placeData;
  } catch (error) {
    console.error('Error fetching place details from Firestore:', error);
    throw error;
  }
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