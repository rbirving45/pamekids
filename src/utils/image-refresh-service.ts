/**
 * Image Refresh Service (Simplified)
 *
 * NOTICE: This service has been simplified since we now store images directly in Firebase Storage
 * and no longer need to refresh URLs from Google Places API.
 *
 * This file maintains the same interface for backward compatibility but doesn't perform
 * actual image refreshing operations.
 */

/**
 * Check if a location's image refresh is currently in progress
 * Always returns false since we no longer refresh images
 */
export const isRefreshInProgress = (locationId: string): boolean => {
  return false;
};

/**
 * Check if a location can be refreshed based on throttling rules
 * Always returns false since we no longer refresh images
 */
export const canRefreshLocation = (locationId: string): boolean => {
  return false;
};

/**
 * Record a refresh attempt for a location
 * This is a no-op stub for backward compatibility
 */
export const recordRefreshAttempt = (locationId: string): void => {
  // No operation needed - this is a stub
  console.log('Image refresh service is disabled - using Firebase Storage instead');
};

/**
 * Refresh a location's image URLs - DISABLED
 * This function is kept for backward compatibility but doesn't perform any operations
 */
export const refreshLocationImages = async (
  locationId: string,
  locationName: string = 'Unknown location'
): Promise<boolean> => {
  console.log(`Image refresh disabled for: ${locationName} (${locationId}) - Using Firebase Storage instead`);
  return false;
};

/**
 * Handle an image error event
 * This simplified version just logs the error and returns false
 */
export const handleImageError = async (
  locationId: string,
  locationName: string,
  imageUrl: string,
  onSuccess?: () => void
): Promise<boolean> => {
  console.log(`Image error detected for ${locationName} (${locationId}): ${imageUrl}`);
  console.log('Image refresh is disabled - Using Firebase Storage instead');
  
  // We don't trigger the success callback since no refresh is performed
  return false;
};