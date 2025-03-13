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
  DocumentData 
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

// Function to get all locations with caching and request deduplication
export const getLocations = async (): Promise<Location[]> => {
  try {
    const now = Date.now();
    const cacheAge = now - locationsCache.timestamp;
    
    // If we have a recent cache (last 30 seconds), use it
    if (locationsCache.data && cacheAge < 30000) {
      return locationsCache.data;
    }
    
    // If there's already a pending request, return that promise instead of starting a new one
    if (locationsCache.pendingPromise) {
      return locationsCache.pendingPromise;
    }
    
    // Start a new fetch operation
    console.log('Fetching locations from Firebase...');
    
    // Create the promise and store it
    const fetchPromise = (async () => {
      try {
        const q = query(collection(db, COLLECTIONS.LOCATIONS));
        const querySnapshot = await getDocs(q);
        
        // Process results
        const locations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Location[];
        
        // Update cache
        locationsCache = {
          data: locations,
          timestamp: Date.now(),
          pendingPromise: null
        };
        
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
      return { id: docSnap.id, ...docSnap.data() } as Location;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
  }
};

// Function to add a new location (for admin use)
export const addLocation = async (location: Omit<Location, 'id'> & { id?: string }) => {
  try {
    // Verify admin authentication
    verifyAdminAuth();
    
    console.log('Adding location:', location.name);
    
    // If an ID is provided, use it, otherwise let Firebase generate one
    if (location.id) {
      const docRef = doc(db, COLLECTIONS.LOCATIONS, location.id);
      await setDoc(docRef, location);
      return { success: true, id: location.id };
    } else {
      const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), location);
      return { success: true, id: docRef.id };
    }
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
    await setDoc(docRef, data, { merge: true });
    return { success: true, id };
  } catch (error) {
    console.error(`Error updating location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
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
    return { success: true, id };
  } catch (error) {
    console.error(`Error deleting location with ID ${id}:`, error);
    throw new Error(formatFirestoreError(error));
  }
};