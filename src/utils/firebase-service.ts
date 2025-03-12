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

// Debug collection references - log full path to help troubleshoot
console.log('Firebase collection paths:');
console.log('- Locations:', 'databases/{database}/documents/' + COLLECTIONS.LOCATIONS);

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
    throw error;
  }
};

export const getNewsletterSubscribers = async (): Promise<DocumentData[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.NEWSLETTER));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting newsletter subscribers:', error);
    throw error;
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
    throw error;
  }
};

export const getReports = async (): Promise<DocumentData[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.REPORTS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
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
    throw error;
  }
};

export const getActivitySuggestions = async (): Promise<DocumentData[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.ACTIVITIES));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting activity suggestions:', error);
    throw error;
  }
};

// Location functions

// Function to get all locations
export const getLocations = async (): Promise<Location[]> => {
  try {
    console.log('Fetching locations from Firebase...');
    const q = query(collection(db, COLLECTIONS.LOCATIONS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
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
    throw error;
  }
};

// Function to add a new location (for admin use)
export const addLocation = async (location: Omit<Location, 'id'> & { id?: string }) => {
  try {
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
    throw error;
  }
};

// Function to update an existing location (for admin use)
export const updateLocation = async (id: string, data: Partial<Location>) => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    await setDoc(docRef, data, { merge: true });
    return { success: true, id };
  } catch (error) {
    console.error(`Error updating location with ID ${id}:`, error);
    throw error;
  }
};

// Function to delete a location (for admin use)
export const deleteLocation = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    await deleteDoc(docRef);
    return { success: true, id };
  } catch (error) {
    console.error(`Error deleting location with ID ${id}:`, error);
    throw error;
  }
};