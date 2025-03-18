/**
 * Image Refresh Service
 * Provides functionality to detect and refresh expired image URLs from Google Places API
 * This service handles throttling and deduplication of refresh requests
 */

// Track locations currently being refreshed to prevent duplicate requests
const refreshingLocations: Record<string, {
  timestamp: number;
  promise: Promise<boolean> | null;
}> = {};

// Tracking recent refresh attempts to implement throttling
const refreshAttempts: Record<string, number[]> = {};

// Constants for throttling logic
const MAX_REFRESH_PER_HOUR = 10; // Maximum refreshes allowed per location per hour
const THROTTLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for throttling
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // Minimum 30 seconds between refreshes

/**
 * Check if a location's image refresh is currently in progress
 * @param locationId The Google Place ID of the location
 * @returns Boolean indicating if a refresh is in progress
 */
export const isRefreshInProgress = (locationId: string): boolean => {
  const entry = refreshingLocations[locationId];
  
  if (!entry) return false;
  
  // If the entry is more than 5 minutes old, consider it stale
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    delete refreshingLocations[locationId];
    return false;
  }
  
  return true;
};

/**
 * Check if a location can be refreshed based on throttling rules
 * @param locationId The Google Place ID of the location
 * @returns Boolean indicating if a refresh is allowed
 */
export const canRefreshLocation = (locationId: string): boolean => {
  const now = Date.now();
  
  // Get timestamps of recent refreshes for this location
  const attempts = refreshAttempts[locationId] || [];
  
  // Remove attempts older than the throttle window
  const recentAttempts = attempts.filter(timestamp =>
    now - timestamp < THROTTLE_WINDOW_MS
  );
  
  // Update the refreshAttempts record
  refreshAttempts[locationId] = recentAttempts;
  
  // Check if we've exceeded the maximum allowed refreshes
  if (recentAttempts.length >= MAX_REFRESH_PER_HOUR) {
    console.log(`Rate limit reached for location ${locationId}: ${recentAttempts.length} refreshes in the last hour`);
    return false;
  }
  
  // Check if the most recent attempt was too recent
  if (recentAttempts.length > 0) {
    const mostRecent = Math.max(...recentAttempts);
    if (now - mostRecent < MIN_REFRESH_INTERVAL_MS) {
      console.log(`Too soon to refresh location ${locationId}: Last refresh was ${Math.round((now - mostRecent)/1000)}s ago`);
      return false;
    }
  }
  
  return true;
};

/**
 * Record a refresh attempt for a location
 * @param locationId The Google Place ID of the location
 */
export const recordRefreshAttempt = (locationId: string): void => {
  const now = Date.now();
  
  // Get existing attempts or initialize empty array
  const attempts = refreshAttempts[locationId] || [];
  
  // Add the current timestamp
  attempts.push(now);
  
  // Update the record
  refreshAttempts[locationId] = attempts;
  
  // Log for monitoring
  console.log(`Recorded refresh attempt for location ${locationId}: ${attempts.length} in the current window`);
};

/**
 * Refresh a location's image URLs via API
 * @param locationId The Google Place ID of the location
 * @param locationName Optional name for better logging
 * @returns Promise resolving to a boolean indicating success
 */
export const refreshLocationImages = async (
  locationId: string,
  locationName: string = 'Unknown location'
): Promise<boolean> => {
  // Check if already refreshing this location
  if (isRefreshInProgress(locationId)) {
    console.log(`Already refreshing location: ${locationName} (${locationId})`);
    
    // Return the existing promise if available
    const existingPromise = refreshingLocations[locationId]?.promise;
    if (existingPromise) return existingPromise;
    
    return false;
  }
  
  // Apply throttling logic
  if (!canRefreshLocation(locationId)) {
    console.log(`Refresh throttled for location: ${locationName} (${locationId})`);
    return false;
  }
  
  // Record this attempt for throttling purposes
  recordRefreshAttempt(locationId);
  
  // Create a new refresh promise
  const refreshPromise = async (): Promise<boolean> => {
    try {
      console.log(`Refreshing images for location: ${locationName} (${locationId})`);
      
      // Make API call to our serverless function
      const response = await fetch('/api/refresh-location-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId,
          // We don't include adminToken for regular user requests
          // Admin requests would be handled separately through the admin dashboard
        })
      });
      
      // Parse the response
      const result = await response.json();
      
      // Handle non-successful responses
      if (!response.ok) {
        throw new Error(result.message || `Server returned status ${response.status}`);
      }
      
      // Check success flag in response
      if (!result.success) {
        throw new Error(result.reason || 'Unknown error in image refresh');
      }
      
      // Log successful refresh details
      console.log(`Successfully refreshed images for: ${locationName} (${locationId})`);
      if (result.photoCount) {
        console.log(`Updated ${result.photoCount} photos for ${locationName}`);
      }
      
      // Record success in localStorage for monitoring
      try {
        const successLog = JSON.parse(localStorage.getItem('image_refresh_success') || '{}');
        successLog[locationId] = {
          timestamp: Date.now(),
          name: locationName,
          photoCount: result.photoCount
        };
        localStorage.setItem('image_refresh_success', JSON.stringify(successLog));
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to refresh images for ${locationName} (${locationId}):`, error);
      
      // Record failure in localStorage for monitoring
      try {
        const failureLog = JSON.parse(localStorage.getItem('image_refresh_failure') || '{}');
        failureLog[locationId] = {
          timestamp: Date.now(),
          name: locationName,
          error: error instanceof Error ? error.message : String(error)
        };
        localStorage.setItem('image_refresh_failure', JSON.stringify(failureLog));
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return false;
    } finally {
      // Clean up after a small delay to prevent immediate re-attempts
      setTimeout(() => {
        delete refreshingLocations[locationId];
      }, 5000);
    }
  };
  
  // Store the promise and timestamp
  const promise = refreshPromise();
  refreshingLocations[locationId] = {
    timestamp: Date.now(),
    promise
  };
  
  return promise;
};

/**
 * Handle an image error event by attempting to refresh the location's images
 * This is the main function that components will call when an image fails to load
 *
 * @param locationId The Google Place ID of the location
 * @param locationName The name of the location for logging
 * @param imageUrl The URL that failed to load
 * @param onSuccess Optional callback when refresh is successful
 * @returns Promise resolving to a boolean indicating if refresh was attempted
 */
export const handleImageError = async (
  locationId: string,
  locationName: string,
  imageUrl: string,
  onSuccess?: () => void
): Promise<boolean> => {
  if (!locationId) {
    console.warn('Cannot refresh images: Missing locationId');
    return false;
  }
  
  console.log(`Image error detected for ${locationName} (${locationId}): ${imageUrl}`);
  
  // Track this error in localStorage for monitoring
  try {
    const errors = JSON.parse(localStorage.getItem('expired_image_urls') || '{}');
    if (!errors[locationId]) {
      errors[locationId] = {
        timestamp: Date.now(),
        name: locationName,
        urls: []
      };
    }
    
    // Add URL to the list if not already present
    if (!errors[locationId].urls.includes(imageUrl)) {
      errors[locationId].urls.push(imageUrl);
    }
    
    errors[locationId].lastError = Date.now();
    localStorage.setItem('expired_image_urls', JSON.stringify(errors));
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Check if we can refresh this location
  if (!canRefreshLocation(locationId)) {
    return false;
  }
  
  // Attempt to refresh the location
  const success = await refreshLocationImages(locationId, locationName);
  
  // If successful and a callback was provided, call it
  if (success && onSuccess) {
    onSuccess();
  }
  
  return success;
};