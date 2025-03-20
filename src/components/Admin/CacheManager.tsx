import React, { useState, useEffect } from 'react';
import {
  clearLocationsCache,
  clearAllPlaceCaches,
  clearAllCaches,
  getCacheInfo,
  estimateCacheSize
} from '../../utils/cache-manager';
import { forcePhotoUpdatesForAllLocations, getUpdateStatus } from '../../utils/firebase-service';

const CacheManager: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState({
    locationsCacheExists: false,
    locationsCacheAge: null as number | null,
    placeCacheCount: 0,
    cacheVersion: null as string | null
  });
  const [cacheSize, setCacheSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    lastUpdate: Date | null;
    nextScheduledUpdate: Date | null;
    successCount: number;
    failedCount: number;
    lastRunType: string | null;
  }>({
    lastUpdate: null,
    nextScheduledUpdate: null,
    successCount: 0,
    failedCount: 0,
    lastRunType: null
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  
  // New state for image refresh statistics
  const [refreshStats, setRefreshStats] = useState<{
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    mostRefreshedLocations: Array<{
      id: string;
      name: string;
      count: number;
      lastRefresh: number;
    }>;
    recentRefreshes: Array<{
      id: string;
      name: string;
      timestamp: number;
      success: boolean;
    }>;
  }>({
    totalRefreshes: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    mostRefreshedLocations: [],
    recentRefreshes: []
  });
  const [isLoadingRefreshStats, setIsLoadingRefreshStats] = useState(false);
  
  // State for photo migration feature
  const [isMigratingPhotos, setIsMigratingPhotos] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    totalLocations: number;
    processedLocations: number;
    totalPhotos: number;
    storedPhotos: number;
    skippedLocations: number;
    failedLocations: number;
    duration?: string;
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Load cache information
  const loadCacheInfo = () => {
    setIsLoading(true);
    try {
      const info = getCacheInfo();
      setCacheInfo(info);
      const size = estimateCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Error loading cache info:', error);
      setMessage({
        text: 'Failed to load cache information',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load scheduled update status
  const loadUpdateStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await getUpdateStatus();
      
      // Helper function to handle Firestore timestamp objects
      const convertTimestamp = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        
        // Handle Firestore timestamp objects
        if (timestamp && typeof timestamp === 'object') {
          // If timestamp has a toDate method (Firestore Timestamp), use it
          if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
          }
          
          // If timestamp has seconds (Firestore Timestamp-like), convert to Date
          if (timestamp.seconds !== undefined) {
            return new Date(timestamp.seconds * 1000);
          }
        }
        
        // Try regular Date conversion for ISO strings
        try {
          return new Date(timestamp);
        } catch (e) {
          console.warn('Failed to parse timestamp:', timestamp);
          return null;
        }
      };
      
      setUpdateStatus({
        lastUpdate: convertTimestamp(status.last_update),
        nextScheduledUpdate: convertTimestamp(status.next_scheduled_update),
        successCount: status.success_count || 0,
        failedCount: status.failed_count || 0,
        lastRunType: status.last_run_type || null
      });
    } catch (error) {
      console.error('Error loading update status:', error);
      // Don't show an error message to avoid cluttering the UI
    } finally {
      setIsLoadingStatus(false);
    }
  };
  
  // Load image refresh statistics
  const loadRefreshStats = () => {
    setIsLoadingRefreshStats(true);
    try {
      // Get data from localStorage
      const expiredUrls = JSON.parse(localStorage.getItem('expired_image_urls') || '{}');
      const successLog = JSON.parse(localStorage.getItem('image_refresh_success') || '{}');
      const failureLog = JSON.parse(localStorage.getItem('image_refresh_failure') || '{}');
      
      // Count successful and failed refreshes
      const successCount = Object.keys(successLog).length;
      const failureCount = Object.keys(failureLog).length;
      const totalCount = successCount + failureCount;
      
      // Get most frequently refreshed locations
      const locationCounts: Record<string, {
        id: string;
        name: string;
        count: number;
        lastRefresh: number;
      }> = {};
      
      // Process expired URLs (detected errors)
      Object.entries(expiredUrls).forEach(([id, data]: [string, any]) => {
        if (!locationCounts[id]) {
          locationCounts[id] = {
            id,
            name: data.name || 'Unknown location',
            count: 0,
            lastRefresh: 0
          };
        }
        
        // Update count based on number of URLs or increment by 1
        const urlCount = Array.isArray(data.urls) ? data.urls.length : 1;
        locationCounts[id].count += urlCount;
        
        // Update last error timestamp if newer
        if (data.lastError && (!locationCounts[id].lastRefresh || data.lastError > locationCounts[id].lastRefresh)) {
          locationCounts[id].lastRefresh = data.lastError;
        }
      });
      
      // Process successful refreshes
      Object.entries(successLog).forEach(([id, data]: [string, any]) => {
        if (!locationCounts[id]) {
          locationCounts[id] = {
            id,
            name: data.name || 'Unknown location',
            count: 0,
            lastRefresh: 0
          };
        }
        
        // Increment count for successful refresh
        locationCounts[id].count += 1;
        
        // Update last refresh timestamp if newer
        if (data.timestamp && (!locationCounts[id].lastRefresh || data.timestamp > locationCounts[id].lastRefresh)) {
          locationCounts[id].lastRefresh = data.timestamp;
        }
      });
      
      // Process failed refreshes
      Object.entries(failureLog).forEach(([id, data]: [string, any]) => {
        if (!locationCounts[id]) {
          locationCounts[id] = {
            id,
            name: data.name || 'Unknown location',
            count: 0,
            lastRefresh: 0
          };
        }
        
        // Increment count for failed refresh
        locationCounts[id].count += 1;
        
        // Update last refresh timestamp if newer
        if (data.timestamp && (!locationCounts[id].lastRefresh || data.timestamp > locationCounts[id].lastRefresh)) {
          locationCounts[id].lastRefresh = data.timestamp;
        }
      });
      
      // Convert to array and sort by count (descending)
      const mostRefreshedLocations = Object.values(locationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10
      
      // Get recent refreshes (combine successful and failed)
      const recentRefreshes: Array<{
        id: string;
        name: string;
        timestamp: number;
        success: boolean;
      }> = [];
      
      // Add successful refreshes
      Object.entries(successLog).forEach(([id, data]: [string, any]) => {
        recentRefreshes.push({
          id,
          name: data.name || 'Unknown location',
          timestamp: data.timestamp || Date.now(),
          success: true
        });
      });
      
      // Add failed refreshes
      Object.entries(failureLog).forEach(([id, data]: [string, any]) => {
        recentRefreshes.push({
          id,
          name: data.name || 'Unknown location',
          timestamp: data.timestamp || Date.now(),
          success: false
        });
      });
      
      // Sort by timestamp (descending) and take the most recent 20
      recentRefreshes.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
      
      // Update state with the calculated statistics
      setRefreshStats({
        totalRefreshes: totalCount,
        successfulRefreshes: successCount,
        failedRefreshes: failureCount,
        mostRefreshedLocations,
        recentRefreshes
      });
    } catch (error) {
      console.error('Error loading refresh statistics:', error);
    } finally {
      setIsLoadingRefreshStats(false);
    }
  };

  // Load cache info, update status, and refresh stats on mount
  useEffect(() => {
    loadCacheInfo();
    loadUpdateStatus();
    loadRefreshStats();
  }, []);

  // Handle clearing locations cache
  const handleClearLocationsCache = () => {
    if (window.confirm('Are you sure you want to clear the locations cache?')) {
      try {
        clearLocationsCache();
        setMessage({
          text: 'Locations cache cleared successfully',
          type: 'success'
        });
        loadCacheInfo(); // Refresh info
      } catch (error) {
        console.error('Error clearing locations cache:', error);
        setMessage({
          text: 'Failed to clear locations cache',
          type: 'error'
        });
      }
    }
  };

  // Handle clearing place caches
  const handleClearPlaceCaches = () => {
    if (window.confirm('Are you sure you want to clear all place caches?')) {
      try {
        clearAllPlaceCaches();
        setMessage({
          text: 'All place caches cleared successfully',
          type: 'success'
        });
        loadCacheInfo(); // Refresh info
      } catch (error) {
        console.error('Error clearing place caches:', error);
        setMessage({
          text: 'Failed to clear place caches',
          type: 'error'
        });
      }
    }
  };

  // Handle clearing all caches
  const handleClearAllCaches = () => {
    if (window.confirm('Are you sure you want to clear ALL app caches? This will force a full reload of all data.')) {
      try {
        clearAllCaches();
        setMessage({
          text: 'All caches cleared successfully',
          type: 'success'
        });
        loadCacheInfo(); // Refresh info
      } catch (error) {
        console.error('Error clearing all caches:', error);
        setMessage({
          text: 'Failed to clear all caches',
          type: 'error'
        });
      }
    }
  };
  
  // Handle force photo and rating updates for all locations
  const handleForcePhotoUpdates = async () => {
    if (window.confirm('This will fetch fresh photos and ratings for ALL locations from Google Places API. Only photos and ratings will be updated; all other manually entered data will be preserved. This may take several minutes and could incur API costs. Continue?')) {
      try {
        setIsUpdatingPhotos(true);
        setMessage({
          text: 'Photo and rating update started. This may take several minutes...',
          type: 'info'
        });
        
        const result = await forcePhotoUpdatesForAllLocations();
        
        setMessage({
          text: `Photos and ratings updated successfully! ${result.success} locations updated, ${result.failed} failed.`,
          type: 'success'
        });
      } catch (error) {
        console.error('Error updating photos and ratings:', error);
        setMessage({
          text: error instanceof Error ? error.message : 'Failed to update photos and ratings',
          type: 'error'
        });
      } finally {
        setIsUpdatingPhotos(false);
      }
    }
  };
  
  // Handle photo migration for locations without stored photos
  const handleMigratePhotos = async () => {
    if (window.confirm('This will download photos from Google and store them permanently in Firebase Storage for all locations that don\'t already have stored photos. This process may take several minutes, but helps prevent broken images due to expiring Google URLs. Continue?')) {
      try {
        // Reset state
        setMigrationError(null);
        setMigrationStats(null);
        setIsMigratingPhotos(true);
        setMessage({
          text: 'Photo migration started. This may take several minutes...',
          type: 'info'
        });
        
        // Get admin token from localStorage
        const token = localStorage.getItem('adminToken');
        if (!token) {
          throw new Error('Admin token not found. Please log in again.');
        }
        
        // Call the migrate-new-photos serverless function
        const response = await fetch('/api/migrate-new-photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Handle response
        if (!response.ok) {
          let errorMessage = 'Server error';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `Status: ${response.status}`;
          } catch (e) {
            errorMessage = `Status: ${response.status} ${response.statusText}`;
          }
          throw new Error(`Migration failed: ${errorMessage}`);
        }
        
        // Parse successful response
        const result = await response.json();
        
        // Update state with migration results
        setMigrationStats(result.stats);
        
        // Show success message
        setMessage({
          text: `Photo migration completed! ${result.stats.storedPhotos} photos stored for ${result.stats.processedLocations} locations.`,
          type: 'success'
        });
      } catch (error) {
        console.error('Error migrating photos:', error);
        setMigrationError(error instanceof Error ? error.message : String(error));
        setMessage({
          text: error instanceof Error ? error.message : 'Failed to migrate photos',
          type: 'error'
        });
      } finally {
        setIsMigratingPhotos(false);
      }
    }
  };

  // Format cache size for display
  const formatCacheSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Application Cache Management</h2>
        <p className="text-gray-600 mt-1">
          Monitor and control browser-based caching for optimal performance and data freshness
        </p>
      </div>
      
      {/* Status message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            message.type === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}
        >
          {message.text}
          <button
            className="float-right font-bold"
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Loading spinner */}
      {isLoading ? (
        <div className="flex justify-center my-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cache information */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Cache Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Locations Cache:</p>
                <p className="font-medium">
                  {cacheInfo.locationsCacheExists ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-500">Not present</span>
                  )}
                  {cacheInfo.locationsCacheAge !== null && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({cacheInfo.locationsCacheAge} minutes old)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Place Caches:</p>
                <p className="font-medium">
                  {cacheInfo.placeCacheCount} location{cacheInfo.placeCacheCount !== 1 && 's'} cached
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Cache Version:</p>
                <p className="font-medium">
                  {cacheInfo.cacheVersion || 'Not set'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cache Size:</p>
                <p className="font-medium">
                  {formatCacheSize(cacheSize)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Cache actions */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Cache Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white border rounded-md">
                <h4 className="font-medium text-blue-600 mb-2">Locations List Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Clears cached location list data. Use after editing locations to ensure users see your changes immediately.
                </p>
                <button
                  onClick={handleClearLocationsCache}
                  disabled={!cacheInfo.locationsCacheExists}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  Clear Locations Cache{cacheInfo.locationsCacheAge !== null && ` (${cacheInfo.locationsCacheAge}m old)`}
                </button>
              </div>
              
              <div className="p-3 bg-white border rounded-md">
                <h4 className="font-medium text-orange-600 mb-2">Google Places Cache</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Clears cached Google data (photos, ratings, hours) for all {cacheInfo.placeCacheCount} locations. Use when this data appears outdated.
                </p>
                <button
                  onClick={handleClearPlaceCaches}
                  disabled={cacheInfo.placeCacheCount === 0}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed"
                >
                  Clear Place Caches ({cacheInfo.placeCacheCount})
                </button>
              </div>
              
              <div className="p-3 bg-white border rounded-md border-red-200">
                <h4 className="font-medium text-red-600 mb-2">All Caches (Nuclear Option)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Clears ALL cached data. Only use when troubleshooting major issues or ensuring complete data refresh.
                </p>
                <button
                  onClick={handleClearAllCaches}
                  disabled={!cacheInfo.locationsCacheExists && cacheInfo.placeCacheCount === 0}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  Clear All Caches
                </button>
              </div>
              
              <div className="p-3 bg-white border rounded-md">
                <h4 className="font-medium text-gray-600 mb-2">Cache Statistics</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Update the cache information displayed above to see current status and sizes.
                </p>
                <button
                  onClick={loadCacheInfo}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Refresh Cache Statistics
                </button>
              </div>
              
              <div className="p-3 bg-white border border-indigo-200 rounded-md">
                <h4 className="font-medium text-indigo-700 mb-2">Force Update Location Photos & Ratings</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Fetch fresh photos and ratings for all locations from Google Places API. Only photos and ratings will be updated; all other manually entered data will be preserved.
                </p>
                <button
                  onClick={handleForcePhotoUpdates}
                  disabled={isUpdatingPhotos}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                  {isUpdatingPhotos ? 'Updating Photos & Ratings...' : 'Update Photos & Ratings'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Cache explanation */}
          <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
            <h4 className="font-medium mb-2">About Caching</h4>
            <p className="text-sm mb-2">
              PameKids uses browser storage to cache data locally to improve performance, reduce API calls, and minimize costs. Cache is automatically refreshed in the background as data gets old.
            </p>
            <p className="text-sm mt-2">
              <strong>When to clear the cache:</strong>
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1 mt-1">
              <li>If you notice outdated information that isn't refreshing automatically</li>
              <li>After making major updates to location data that should be immediately visible</li>
              <li>If users report seeing inconsistent or incorrect data</li>
              <li>When troubleshooting unexplained application behavior</li>
            </ul>
          </div>

          {/* Detailed explanation of each cache type */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Cache Types Explained</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-base">Locations Cache</h4>
                <p className="text-sm mt-1">
                  <strong>What it stores:</strong> The main list of all locations and their basic details
                </p>
                <p className="text-sm mt-1">
                  <strong>Benefits:</strong> Faster initial app loading, works offline, reduces Firestore reads
                </p>
                <p className="text-sm mt-1">
                  <strong>When to clear:</strong> After adding/updating/removing locations through the admin panel
                </p>
                <p className="text-sm mt-1">
                  <strong>Impact of clearing:</strong> Next app load will be slower as data reloads from Firestore
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-base">Place Caches ({cacheInfo.placeCacheCount})</h4>
                <p className="text-sm mt-1">
                  <strong>What it stores:</strong> Detailed information from Google Places API for each viewed location
                </p>
                <p className="text-sm mt-1">
                  <strong>Benefits:</strong> Reduces Google API calls (costs), shows photos/ratings instantly
                </p>
                <p className="text-sm mt-1">
                  <strong>When to clear:</strong> If specific locations show outdated photos, ratings, or hours
                </p>
                <p className="text-sm mt-1">
                  <strong>Impact of clearing:</strong> Next time a user views a location, fresh data will be fetched from Google
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-base">All Caches (Nuclear Option)</h4>
                <p className="text-sm mt-1">
                  <strong>What it clears:</strong> All locally stored location data and Google Places data
                </p>
                <p className="text-sm mt-1">
                  <strong>When to use:</strong> Major troubleshooting or ensuring users get completely fresh data
                </p>
                <p className="text-sm mt-1">
                  <strong>Impact:</strong> Next app load will be slower and trigger more API calls
                </p>
              </div>
            </div>
          </div>
          
          {/* Photo Migration Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-3">Firebase Storage Photo Migration</h3>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-purple-700">Migrate Google Photos to Permanent Storage</h4>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  This tool processes photos for all locations that don't already have permanent images in Firebase Storage.
                  It will download Google Places photos and store them permanently, making them immune to Google's URL expiration.
                </p>
                
                <div className="mb-2 flex">
                  <button
                    onClick={handleMigratePhotos}
                    disabled={isMigratingPhotos}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
                  >
                    {isMigratingPhotos ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating Photos...
                      </span>
                    ) : (
                      "Migrate New Photos to Firebase Storage"
                    )}
                  </button>
                </div>
              </div>
              
              {migrationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <h5 className="text-sm font-medium text-red-700 mb-1">Migration Error</h5>
                  <p className="text-sm text-red-600">{migrationError}</p>
                </div>
              )}
              
              {migrationStats && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2">Migration Results</h5>
                  <div className="bg-white p-3 rounded-md border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Total Locations:</p>
                        <p className="font-medium">{migrationStats.totalLocations}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Photos Stored:</p>
                        <p className="font-medium text-green-600">{migrationStats.storedPhotos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Locations Processed:</p>
                        <p className="font-medium">{migrationStats.processedLocations}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Locations Skipped:</p>
                        <p className="font-medium text-gray-600">{migrationStats.skippedLocations}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Failed:</p>
                        <p className="font-medium text-red-600">{migrationStats.failedLocations}</p>
                      </div>
                      {migrationStats.duration && (
                        <div>
                          <p className="text-xs text-gray-500">Time Taken:</p>
                          <p className="font-medium">{migrationStats.duration}s</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                <p className="font-medium mb-1">About Photo Migration</p>
                <p className="mb-2">
                  This tool provides a permanent solution to Google's URL expiration issue by downloading and storing photos in your own Firebase Storage.
                </p>
                <ul className="ml-5 list-disc text-blue-700 space-y-1">
                  <li>Only processes locations without existing stored photos</li>
                  <li>Creates permanent copies that won't expire</li>
                  <li>Helpful after adding new locations</li>
                  <li>Runs in small batches to prevent timeouts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Automated Update Status */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-3">Scheduled Updates Status</h3>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-indigo-700">Automated Photo & Rating Updates</h4>
                {isLoadingStatus ? (
                  <div className="animate-pulse h-5 w-24 bg-gray-200 rounded"></div>
                ) : (
                  <button
                    onClick={loadUpdateStatus}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                      <path d="M3 22v-6h6"></path>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    Refresh
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Last Update:</p>
                  <p className="font-medium">
                    {updateStatus.lastUpdate && !isNaN(updateStatus.lastUpdate.getTime()) ? (
                      <span className="text-green-600">
                        {updateStatus.lastUpdate.toLocaleString()}
                        {updateStatus.lastRunType && ` (${updateStatus.lastRunType})`}
                      </span>
                    ) : (
                      <span className="text-gray-500">No updates yet</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next Scheduled Update:</p>
                  <p className="font-medium">
                    {updateStatus.nextScheduledUpdate && !isNaN(updateStatus.nextScheduledUpdate.getTime()) ? (
                      <span className="text-blue-600">
                        {updateStatus.nextScheduledUpdate.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">Unknown</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Success Rate:</p>
                  <p className="font-medium">
                    {updateStatus.successCount || updateStatus.failedCount ? (
                      <span className={updateStatus.successCount > updateStatus.failedCount ? "text-green-600" : "text-orange-600"}>
                        {updateStatus.successCount} successes / {updateStatus.failedCount} failures
                        {" "}
                        ({updateStatus.successCount + updateStatus.failedCount > 0
                          ? Math.round((updateStatus.successCount / (updateStatus.successCount + updateStatus.failedCount)) * 100)
                          : 0}%)
                      </span>
                    ) : (
                      <span className="text-gray-500">No data available</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Update Frequency:</p>
                  <p className="font-medium text-gray-900">Every 72 hours (3 days)</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                <p className="font-medium">Fields Updated Automatically:</p>
                <ul className="mt-1 ml-5 list-disc text-blue-700">
                  <li>Photo URLs</li>
                  <li>Rating scores</li>
                  <li>Number of ratings</li>
                </ul>
                <p className="mt-2 italic text-blue-600">All other fields are preserved and must be updated manually.</p>
              </div>
            </div>
          </div>

          {/* Image Refresh Statistics */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-3">Image Refresh Statistics</h3>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-indigo-700">Real-time Image URL Refresh Activity</h4>
                {isLoadingRefreshStats ? (
                  <div className="animate-pulse h-5 w-24 bg-gray-200 rounded"></div>
                ) : (
                  <button
                    onClick={loadRefreshStats}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                      <path d="M3 22v-6h6"></path>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    Refresh
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Total Refreshes:</p>
                  <p className="font-medium text-2xl">
                    {refreshStats.totalRefreshes}
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Success Rate:</p>
                  <p className="font-medium text-2xl text-green-600">
                    {refreshStats.totalRefreshes ?
                      `${Math.round((refreshStats.successfulRefreshes / refreshStats.totalRefreshes) * 100)}%` :
                      'N/A'}
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Failed Refreshes:</p>
                  <p className="font-medium text-2xl text-red-600">
                    {refreshStats.failedRefreshes}
                  </p>
                </div>
              </div>
              
              <h4 className="font-medium mb-3 mt-6">Most Frequently Refreshed Locations</h4>
              {refreshStats.mostRefreshedLocations.length > 0 ? (
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Refresh Count</th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Refresh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {refreshStats.mostRefreshedLocations.map((location) => (
                        <tr key={location.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{location.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">{location.count}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                            {location.lastRefresh ?
                              new Date(location.lastRefresh).toLocaleString() :
                              'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white p-6 text-center text-gray-500 border border-gray-200 rounded-md">
                  No refresh data available yet
                </div>
              )}
              
              <h4 className="font-medium mb-3 mt-6">Recent Refresh Activity</h4>
              {refreshStats.recentRefreshes.length > 0 ? (
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {refreshStats.recentRefreshes.map((refresh, index) => (
                        <tr key={`${refresh.id}-${index}`}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(refresh.timestamp).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{refresh.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              refresh.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {refresh.success ? 'Success' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white p-6 text-center text-gray-500 border border-gray-200 rounded-md">
                  No recent refresh activity
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg">
                <h4 className="font-medium mb-2">About Image Refreshing</h4>
                <p className="text-sm">
                  PameKids now automatically detects and refreshes expired Google image URLs in real-time. When a user encounters a broken image, the system will:
                </p>
                <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                  <li>Detect the broken image URL</li>
                  <li>Queue a refresh request for just that location</li>
                  <li>Fetch fresh image URLs from Google Places API</li>
                  <li>Update the location in Firestore</li>
                  <li>Reload the images for the user</li>
                </ul>
                <p className="text-sm mt-2">
                  <strong>Benefits:</strong> Users always see images instead of fallbacks, and only locations with issues are refreshed (saving API quota).
                </p>
              </div>
            </div>
          </div>

          {/* Technical details */}
          <div className="p-4 bg-gray-50 rounded-lg mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Technical Notes</h4>
            <p className="text-sm">
              <strong>Automatic Refreshing:</strong> The app automatically refreshes stale data in the background. Locations cache expires after 24 hours, and place details are refreshed after 6 hours but still shown from cache for speed.
            </p>
            <p className="text-sm mt-2">
              <strong>Server Syncing:</strong> When a user views location details, fresh data from Google is stored both in browser cache and sent to Firestore (maximum once per day) to help other users get fresh data too.
            </p>
            <p className="text-sm mt-2">
              <strong>Scheduled Updates:</strong> Every 72 hours, an automated process updates photos, ratings, and review counts for all locations without modifying any other data.
            </p>
            <p className="text-sm mt-2">
              <strong>Real-time Image Refresh:</strong> When broken images are detected, a targeted refresh is triggered only for the affected location. Requests are rate-limited to prevent API quota issues.
            </p>
            <p className="text-sm mt-2">
              <strong>Cache Version:</strong> Currently {cacheInfo.cacheVersion || 'Not set'} - This automatically manages compatibility when the app is updated with new features.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CacheManager;