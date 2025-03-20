// functions/firebase-admin.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp;
let storageBucket;

function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Debug logging - print current working directory to help troubleshoot
    console.log('Current working directory:', process.cwd());
    console.log('ADMIN_TOKEN available:', !!process.env.ADMIN_TOKEN);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Try to parse service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      try {
        // Initialize with parsed service account from environment variable
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized with service account from environment variable');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', parseError);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT environment variable: ' + parseError.message);
      }
    } else {
      // For local development, try multiple possible paths for the service account file
      const possiblePaths = [
        // Current directory
        './firebase-service-account.json',
        // Functions directory
        path.join(__dirname, 'firebase-service-account.json'),
        // Project root
        path.join(process.cwd(), 'firebase-service-account.json'),
        // Functions from project root
        path.join(process.cwd(), 'functions', 'firebase-service-account.json')
      ];
      
      console.log('Looking for service account file in these locations:');
      possiblePaths.forEach(p => console.log(' - ' + p));
      
      let serviceAccountPath = null;
      for (const p of possiblePaths) {
        try {
          if (fs.existsSync(p)) {
            serviceAccountPath = p;
            console.log('Found service account file at:', p);
            break;
          }
        } catch (e) {
          // Ignore errors and try the next path
          console.log('Error checking path:', p, e.message);
        }
      }
      
      if (!serviceAccountPath) {
        console.error('Service account file not found in any of the expected locations!');
        throw new Error('Firebase service account file not found. Please ensure firebase-service-account.json exists in the functions directory.');
      }
      
      try {
        // Use fs.readFileSync instead of require to avoid caching issues
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        // Validate the service account file has the minimum required fields
        if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key) {
          throw new Error('Service account file is missing required fields');
        }
        
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully with service account from:', serviceAccountPath);
      } catch (requireError) {
        console.error('Failed to load service account file:', requireError);
        throw new Error(`Failed to load service account file (${serviceAccountPath}): ${requireError.message}`);
      }
    }
    
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

function getFirestore() {
  try {
    const app = initializeFirebaseAdmin();
    return app.firestore();
  } catch (error) {
    console.error('Error getting Firestore instance:', error);
    throw error;
  }
}

function getStorage() {
  try {
    const app = initializeFirebaseAdmin();
    
    // Initialize Storage bucket if not already done
    if (!storageBucket) {
      storageBucket = app.storage();
      console.log('Firebase Storage initialized successfully');
    }
    
    return storageBucket;
  } catch (error) {
    console.error('Error getting Storage instance:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebaseAdmin,
  getFirestore,
  getStorage
};