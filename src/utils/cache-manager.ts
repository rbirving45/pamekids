/**
 * Cache Manager Utility
 * Provides functions to manage all caches in the application
 */

// Cache constants - keep in sync with other files
const CACHE_KEYS = {
  LOCATIONS_LIST: 'pamekids_locations_cache',
  CACHE_VERSION: 'pamekids_cache_version',
  PLACE_DETAILS_PREFIX: 'pamekids_place_'
};

/**
 * Clear all location list cache data
 */
export const clearLocationsCache = (): boolean => {
  try {
    localStorage.removeItem(CACHE_KEYS.LOCATIONS_LIST);
    console.log('Locations cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear locations cache:', error);
    return false;
  }
};

/**
 * Clear cache for a specific place
 * @param placeId Google Place ID to clear
 */
export const clearPlaceCache = (placeId: string): boolean => {
  try {
    const key = `${CACHE_KEYS.PLACE_DETAILS_PREFIX}${placeId}`;
    localStorage.removeItem(key);
    console.log(`Cache cleared for place: ${placeId}`);
    return true;
  } catch (error) {
    console.error(`Failed to clear cache for place ${placeId}:`, error);
    return false;
  }
};

/**
 * Clear all place detail caches
 */
export const clearAllPlaceCaches = (): boolean => {
  try {
    let count = 0;
    // Find all keys that start with the place prefix
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEYS.PLACE_DETAILS_PREFIX)) {
        localStorage.removeItem(key);
        count++;
      }
    });
    console.log(`Cleared ${count} place caches`);
    return true;
  } catch (error) {
    console.error('Failed to clear all place caches:', error);
    return false;
  }
};

/**
 * Get information about the current cache
 */
export const getCacheInfo = (): {
  locationsCacheExists: boolean;
  locationsCacheAge: number | null;
  placeCacheCount: number;
  cacheVersion: string | null;
} => {
  try {
    // Check for locations cache
    const locationsCache = localStorage.getItem(CACHE_KEYS.LOCATIONS_LIST);
    let locationsCacheExists = false;
    let locationsCacheAge = null;
    
    if (locationsCache) {
      locationsCacheExists = true;
      try {
        const parsedCache = JSON.parse(locationsCache);
        if (parsedCache.timestamp) {
          locationsCacheAge = Math.floor((Date.now() - parsedCache.timestamp) / (60 * 1000)); // Age in minutes
        }
      } catch (e) {
        console.warn('Failed to parse locations cache:', e);
      }
    }
    
    // Count place caches
    let placeCacheCount = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEYS.PLACE_DETAILS_PREFIX)) {
        placeCacheCount++;
      }
    });
    
    // Get cache version
    const cacheVersion = localStorage.getItem(CACHE_KEYS.CACHE_VERSION);
    
    return {
      locationsCacheExists,
      locationsCacheAge,
      placeCacheCount,
      cacheVersion
    };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return {
      locationsCacheExists: false,
      locationsCacheAge: null,
      placeCacheCount: 0,
      cacheVersion: null
    };
  }
};

/**
 * Clear all application caches - the nuclear option
 */
export const clearAllCaches = (): boolean => {
  try {
    clearLocationsCache();
    clearAllPlaceCaches();
    localStorage.removeItem(CACHE_KEYS.CACHE_VERSION);
    console.log('All application caches cleared');
    
    // Don't clear session-related caches like authentication
    return true;
  } catch (error) {
    console.error('Failed to clear all caches:', error);
    return false;
  }
};

/**
 * Estimate total cache size
 */
export const estimateCacheSize = (): number => {
  try {
    let totalSize = 0;
    
    // Calculate size of all localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pamekids_')) {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length * 2; // Approximate size in bytes (UTF-16 encoding)
        }
      }
    });
    
    return totalSize;
  } catch (error) {
    console.error('Failed to estimate cache size:', error);
    return 0;
  }
};