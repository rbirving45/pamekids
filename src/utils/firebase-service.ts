import { db } from './firebase';
import { Location } from '../types/location';
import { 
  collection, 
  addDoc, 
  setDoc,
  doc,
  getDoc,
  getDocs, 
  deleteDoc,
  query, 
  Timestamp, 
  DocumentData,
  serverTimestamp
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  NEWSLETTER: 'newsletter-subscribers',
  REPORTS: 'location-reports',
  ACTIVITIES: 'activity-suggestions',
  LOCATIONS: 'locations' // Ensure this matches exactly with Firebase rules
};

// Helper function to check if user is authenticated as admin
const verifyAdminAuth = (): string => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    throw new Error('Admin authentication required. Please log in again.');
  }
  return adminToken;
};

// Helper to format Firestore errors with more user-friendly messages
const formatFirestoreError = (error: any): string => {
  console.error('Firestore operation error:', error);
  
  if (error.code === 'permission-denied') {
    return 'You do not have permission to perform this operation. Please make sure you are logged in as an admin.';
  }
  
  if (error.code === 'unavailable') {
    return 'Database is currently unavailable. Please check your internet connection and try again.';
  }
  
  if (error.code === 'not-found') {
    return 'The requested document does not exist.';
  }
  
  return error.message || 'An unknown error occurred';
};

// Newsletter functions
export const addNewsletterSubscriber = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.NEWSLETTER), {
      ...data,
      subscribedAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding newsletter subscriber:', error);
    throw new Error(formatFirestoreError(error));
  }
};

export const getNewsletterSubscribers = async (): Promise<DocumentData[]> => {
  try {
    // Verify admin authentication for sensitive data
    verifyAdminAuth();
    
    const q = query(collection(db, COLLECTIONS.NEWSLETTER));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting newsletter subscribers:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Report functions
export const addReport = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.REPORTS), {
      ...data,
      timestamp: Timestamp.now(),
      status: 'new'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding report:', error);
    throw new Error(formatFirestoreError(error));
  }
};

export const getReports = async (): Promise<DocumentData[]> => {
  try {
    // Verify admin authentication for sensitive data
    verifyAdminAuth();
    
    const q = query(collection(db, COLLECTIONS.REPORTS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Activity suggestions functions
export const addActivitySuggestion = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVITIES), {
      ...data,
      timestamp: Timestamp.now(),
      status: 'pending'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding activity suggestion:', error);
    throw new Error(formatFirestoreError(error));
  }
};

export const getActivitySuggestions = async (): Promise<DocumentData[]> => {
  try {
    // Verify admin authentication for sensitive data
    verifyAdminAuth();
    
    const q = query(collection(db, COLLECTIONS.ACTIVITIES));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting activity suggestions:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Location functions

// Function to force photo and rating updates for all locations (admin only)
// Now calls the serverless function instead of doing updates in-browser
export const forcePhotoUpdatesForAllLocations = async (): Promise<{success: number, failed: number}> => {
  try {
    // Verify admin authentication
    verifyAdminAuth();
    
    console.log('Triggering server-side photo and rating updates for all locations...');
    
    // Call the server-side function instead of processing in-browser
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/force-places-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log(`Server-side update completed: ${result.success} succeeded, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('Error triggering server-side photo updates:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to update only photo URLs for a location
export const updatePhotoUrlsForLocation = async (id: string, photoUrls: string[]): Promise<boolean> => {
  try {
    if (!id || !photoUrls || photoUrls.length === 0) {
      return false;
    }
    
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return false;
    }
    
    // Get existing placeData to preserve other fields
    const existingData = docSnap.data();
    const existingPlaceData = existingData.placeData || {};
    
    // Update only the photoUrls field in placeData while preserving all other fields
    const updateData = {
      placeData: {
        ...existingPlaceData,  // Keep all existing place data
        photoUrls: photoUrls   // Only update the photos
      },
      placeData_updated_at: serverTimestamp()
    };
    
    await setDoc(docRef, updateData, { merge: true });
    console.log(`Updated ${photoUrls.length} photo URLs for location ${id}`);
    
    return true;
  } catch (error) {
    console.error(`Error updating photo URLs for location ${id}:`, error);
    return false;
  }
};

// Cache constants
const CACHE_KEYS = {
  LOCATIONS_LIST: 'pamekids_locations_cache',
  CACHE_VERSION: 'pamekids_cache_version'
};
const CACHE_VERSION = '1.0'; // Increment when data structure changes
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for locations
let locationsCache: {
  data: Location[] | null;
  timestamp: number;
  pendingPromise: Promise<Location[]> | null;
} = {
  data: null,
  timestamp: 0,
  pendingPromise: null
};

// Helper function to get cached locations from localStorage
const getLocationsFromLocalStorage = (): {data: Location[] | null, timestamp: number} => {
  try {
    // Check cache version first
    const cacheVersion = localStorage.getItem(CACHE_KEYS.CACHE_VERSION);
    if (cacheVersion !== CACHE_VERSION) {
      // Clear all caches if version doesn't match
      localStorage.removeItem(CACHE_KEYS.LOCATIONS_LIST);
      localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
      return { data: null, timestamp: 0 };
    }
    
    const cachedData = localStorage.getItem(CACHE_KEYS.LOCATIONS_LIST);
    if (!cachedData) return { data: null, timestamp: 0 };
    
    const parsed = JSON.parse(cachedData);
    return {
      data: parsed.data,
      timestamp: parsed.timestamp
    };
  } catch (error) {
    console.warn('Error reading from localStorage cache:', error);
    return { data: null, timestamp: 0 };
  }
};

// Helper function to save locations to localStorage
const saveLocationsToLocalStorage = (locations: Location[]) => {
  try {
    const cacheData = {
      data: locations,
      timestamp: Date.now()
    };
    
    // Set cache version
    localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
    localStorage.setItem(CACHE_KEYS.LOCATIONS_LIST, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error saving to localStorage cache:', error);
  }
};

// Function to clear the cache - called after admin operations
export const clearLocationsCache = () => {
  try {
    // Reset the memory cache
    locationsCache = {
      data: null,
      timestamp: 0,
      pendingPromise: null
    };
    
    // Clear localStorage cache
    localStorage.removeItem(CACHE_KEYS.LOCATIONS_LIST);
    console.log('Locations cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing locations cache:', error);
    return false;
  }
};

// Get all locations with caching and request deduplication
export const getLocations = async (forceRefresh = false): Promise<Location[]> => {
  try {
    const now = Date.now();
    
    // If forceRefresh is set, skip all caches
    if (forceRefresh) {
      console.log('Force refreshing locations from Firebase...');
      // Reset cache state to ensure we do a fresh fetch
      locationsCache.data = null;
      locationsCache.timestamp = 0;
      locationsCache.pendingPromise = null;
      
      // Also clear localStorage cache when force refreshing
      localStorage.removeItem(CACHE_KEYS.LOCATIONS_LIST);
    } else {
      // Check memory cache first (most efficient)
      const memCacheAge = now - locationsCache.timestamp;
      if (locationsCache.data && memCacheAge < CACHE_EXPIRATION_MS) {
        console.log(`Using in-memory cached locations (age: ${Math.round(memCacheAge/1000)}s)`);
        return locationsCache.data;
      }
    }
    
    // Next, check localStorage cache
    const { data: localStorageData, timestamp: localStorageTimestamp } = getLocationsFromLocalStorage();
    const localStorageCacheAge = now - localStorageTimestamp;
    
    // If localStorage has valid cache, use it and update memory cache
    if (localStorageData && localStorageCacheAge < CACHE_EXPIRATION_MS && !forceRefresh) {
      console.log(`Using localStorage cached locations (age: ${Math.round(localStorageCacheAge/60000)}m)`);
      
      // Update memory cache
      locationsCache = {
        data: localStorageData,
        timestamp: localStorageTimestamp,
        pendingPromise: null
      };
      
      // Fetch fresh data in background if cache is older than 1 hour
      if (localStorageCacheAge > 3600000) {
        console.log('Cache is valid but aging, refreshing in background...');
        setTimeout(() => {
          getLocations().catch(err => console.error('Background refresh error:', err));
        }, 1000);
      }
      
      return localStorageData;
    }
    
    // If there's already a pending request, return that promise instead of starting a new one
    if (locationsCache.pendingPromise) {
      console.log('Reusing in-flight locations request');
      return locationsCache.pendingPromise;
    }
    
    // No valid cache, start a new fetch operation
    console.log('No valid cache found. Fetching locations from Firebase...');
    
    // Create the promise and store it
    const fetchPromise = (async () => {
      try {
        const q = query(collection(db, COLLECTIONS.LOCATIONS));
        const querySnapshot = await getDocs(q);
        
        // Process results - ensure clean data for map initialization
        const locations = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure we're returning a valid Location object
          const location: Location = {
            id: doc.id,
            name: data.name || '',
            coordinates: data.coordinates || { lat: 0, lng: 0 },
            types: data.types || [],
            primaryType: data.primaryType || 'entertainment',
            description: data.description || '',
            address: data.address || '',
            ageRange: data.ageRange || { min: 0, max: 16 },
            priceRange: data.priceRange,
            openingHours: data.openingHours || {},
            contact: data.contact || {},
            placeData: data.placeData,
            images: data.images,
            featured: data.featured,
            proTips: data.proTips || '', // Add proTips field with empty string default
            created_at: data.created_at || null,
            updated_at: data.updated_at || null
          };
          return location;
        });
        
        // Update memory cache
        locationsCache = {
          data: locations,
          timestamp: Date.now(),
          pendingPromise: null
        };
        
        // Update localStorage cache
        saveLocationsToLocalStorage(locations);
        
        return locations;
      } catch (error) {
        // Clean up the pending promise on error
        locationsCache.pendingPromise = null;
        throw error;
      }
    })();
    
    // Store the promise in the cache
    locationsCache.pendingPromise = fetchPromise;
    
    return fetchPromise;
  } catch (error) {
    console.error('Error getting locations:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to get a single location by ID
export const getLocationById = async (id: string): Promise<Location | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Explicitly ensure all fields are mapped correctly
      const location: Location = {
        id: docSnap.id,
        name: data.name || '',
        coordinates: data.coordinates || { lat: 0, lng: 0 },
        types: data.types || [],
        primaryType: data.primaryType || 'entertainment',
        description: data.description || '',
        address: data.address || '',
        ageRange: data.ageRange || { min: 0, max: 16 },
        priceRange: data.priceRange,
        openingHours: data.openingHours || {},
        contact: data.contact || {},
        placeData: data.placeData,
        images: data.images,
        featured: data.featured,
        proTips: data.proTips || '', // Add proTips with default
        created_at: data.created_at || null,
        updated_at: data.updated_at || null
      };
      return location;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to add a new location (for admin use)
export const addLocation = async (location: Location) => {
  try {
    // Verify admin authentication
    verifyAdminAuth();
    
    console.log('Adding location:', location.name);
    
    // Ensure location ID is properly defined
    if (!location.id || typeof location.id !== 'string' || location.id.trim() === '') {
      throw new Error('A valid Google Place ID is required for adding locations');
    }
    
    // Use the Google Place ID as the document ID
    const placeId = location.id.trim();
    console.log(`Using Google Place ID as document ID: ${placeId}`);
    
    // Add timestamps
    const locationWithTimestamps = {
      ...location,
      id: placeId, // Ensure ID is consistent
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    // Create a document reference with the Place ID
    const docRef = doc(db, COLLECTIONS.LOCATIONS, placeId);
    
    // Remove id field to avoid duplication in the document
    const { id: _, ...locationData } = locationWithTimestamps;
    
    // Save to Firestore
    await setDoc(docRef, locationData);
    
    // Clear cache to ensure admin UI is updated immediately
    clearLocationsCache();
    
    return { success: true, id: placeId };
  } catch (error) {
    console.error('Error adding location:', error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to update an existing location (for admin use)
export const updateLocation = async (id: string, data: Partial<Location>) => {
  try {
    // Verify admin authentication
    verifyAdminAuth();
    
    console.log(`Updating location with ID ${id}`);
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    
    // Deep clean function to handle complex nested objects
    const deepCleanUndefined = (obj: any): any => {
      // Return non-objects as is (includes null, which is valid for Firestore)
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
      }
      
      // Clean each property in the object
      const result: Record<string, any> = {};
      Object.entries(obj).forEach(([key, value]) => {
        // Skip undefined values completely
        if (value === undefined) return;
        
        // Recursively clean objects
        if (value !== null && typeof value === 'object') {
          const cleanedValue = deepCleanUndefined(value);
          // Only add non-empty objects
          if (Array.isArray(cleanedValue) || Object.keys(cleanedValue).length > 0) {
            result[key] = cleanedValue;
          }
        } else {
          // Add primitive values directly
          result[key] = value;
        }
      });
      
      return result;
    };
    
    // Clean up data to remove any undefined values to avoid Firestore errors
    const cleanedData = deepCleanUndefined(data);
    
    // Add the updated_at timestamp
    const dataWithTimestamp = {
      ...cleanedData,
      updated_at: serverTimestamp()
    };
    
    await setDoc(docRef, dataWithTimestamp, { merge: true });
    
    // Clear locations cache to ensure immediate refresh in admin UI
    clearLocationsCache();
    
    return { success: true, id };
  } catch (error) {
    console.error(`Error updating location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to update a location's Google Places data - DISABLED FOR REGULAR USERS
// Now only used by admin functions and scheduled weekly updates
export const updateLocationPlaceData = async (id: string, placeData: any): Promise<boolean> => {
  try {
    // This function is kept for compatibility but no longer triggers updates from user interactions
    // Log the attempt but don't perform any updates
    console.log(`[DISABLED] Place data update requested for ${id} - now handled by weekly scheduled updates`);
    
    // Always return success to prevent error cascades elsewhere in the app
    return true;
  } catch (error) {
    console.error(`Error in updateLocationPlaceData (disabled) for ${id}:`, error);
    return false;
  }
};

// Function to delete a location (for admin use)
export const deleteLocation = async (id: string) => {
  try {
    // Verify admin authentication
    verifyAdminAuth();
    
    console.log(`Deleting location with ID ${id}`);
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    await deleteDoc(docRef);
    
    // Clear locations cache to ensure immediate refresh in admin UI
    clearLocationsCache();
    
    return { success: true, id };
  } catch (error) {
    console.error(`Error deleting location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
  }
};