// functions/firebase-admin.js
const admin = require('firebase-admin');

let firebaseApp;

function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Try to parse service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      // Initialize with parsed service account
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with service account from environment');
    } else {
      // For local development, you can place your service account JSON file in the functions directory
      const serviceAccountPath = './firebase-service-account.json';
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
      console.log('Firebase Admin initialized with local service account file');
    }
    
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

function getFirestore() {
  const app = initializeFirebaseAdmin();
  return app.firestore();
}

module.exports = {
  initializeFirebaseAdmin,
  getFirestore
};