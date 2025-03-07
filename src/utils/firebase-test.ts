import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    // Try to connect to Firestore
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    
    console.log('Firebase connection successful');
    console.log('Documents in test collection:', snapshot.docs.length);
    
    return {
      success: true,
      message: 'Firebase connection successful',
      documentsCount: snapshot.docs.length
    };
  } catch (error) {
    console.error('Firebase test error:', error);
    
    return {
      success: false,
      message: 'Firebase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};