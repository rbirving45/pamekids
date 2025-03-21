/**
 * Netlify serverless BACKGROUND function to delete photos for a single location
 * This function removes all photos associated with a location from Firebase Storage
 * when the location is deleted from Firestore.
 *
 * ES Module version for Netlify background function compatibility
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Firebase initialization for ES modules
let firebaseApp;
let storageBucket;

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    console.log('Initializing Firebase Admin in ES Module');
    
    // Get the storage bucket name from environment variable
    const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET ||
                             process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
    
    console.log('Storage bucket name:', storageBucketName || 'NOT FOUND');
    
    if (!storageBucketName) {
      console.warn('WARNING: Storage bucket name not found in environment variables. Using hardcoded value.');
    }
    
    // Try to parse service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      try {
        // Initialize with parsed service account from environment variable
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: storageBucketName || 'pamekids-ab0e5.firebasestorage.app'
        });
        console.log('Firebase Admin initialized with service account from environment variable');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', parseError);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT environment variable: ' + parseError.message);
      }
    } else {
      // For local development, try multiple possible paths for the service account file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
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
        // Use fs.readFileSync to read the file
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        // Validate the service account file has the minimum required fields
        if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key) {
          throw new Error('Service account file is missing required fields');
        }
        
        // Get the storage bucket name from environment variable or use hardcoded value
        const bucketName = storageBucketName || 'pamekids-ab0e5.firebasestorage.app';
        
        firebaseApp = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: bucketName
        });
        console.log('Firebase Admin initialized successfully with service account from:', serviceAccountPath);
        console.log('Storage bucket configured:', bucketName);
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

// Get Storage instance
function getStorageInstance() {
  try {
    const app = initializeFirebaseAdmin();
    
    // HARDCODED BUCKET - Use the correct Firebase Storage bucket name
    const FIREBASE_BUCKET = 'pamekids-ab0e5.firebasestorage.app';
    
    // Initialize Storage bucket if not already done
    if (!storageBucket) {
      console.log(`Using hardcoded storage bucket: ${FIREBASE_BUCKET}`);
      
      // Initialize storage with explicit hardcoded bucket name
      storageBucket = app.storage().bucket(FIREBASE_BUCKET);
      console.log(`Firebase Storage initialized successfully with bucket: ${FIREBASE_BUCKET}`);
    }
    
    return storageBucket;
  } catch (error) {
    console.error('Error getting Storage instance:', error);
    throw error;
  }
}

// Verify admin authentication
async function verifyAdminAuth(token) {
  if (!token) {
    throw new Error('Admin authentication required - no token provided');
  }
  
  // Validate against the environment variable
  if (!process.env.ADMIN_TOKEN) {
    console.error('ADMIN_TOKEN environment variable is not set');
    throw new Error('Server configuration error: Admin token is not configured');
  }
  
  if (token !== process.env.ADMIN_TOKEN) {
    console.warn('Invalid admin token provided');
    throw new Error('Invalid admin token - authentication failed');
  }
  
  console.log('Admin authentication successful');
  return true;
}

/**
 * Process deletion of a location's photos
 */
async function deleteLocationPhotos(locationId) {
  try {
    if (!locationId) {
      throw new Error('Location ID is required');
    }
    
    console.log(`Starting to delete photos for location: ${locationId}`);
    
    // HARDCODED BUCKET - Use the correct Firebase Storage bucket name
    // This MUST match your Firebase Storage bucket name exactly, following the pattern in your other functions
    const FIREBASE_BUCKET = 'pamekids-ab0e5.firebasestorage.app';
    
    console.log(`Using hardcoded storage bucket: ${FIREBASE_BUCKET}`);
    
    // Initialize Firebase Admin
    const storage = getStorageInstance();
    
    // Get bucket with explicit hardcoded bucket name
    const bucket = storage;
    
    // Path to the location's photos directory
    const locationPhotosPath = `location_photos/${locationId}/`;
    
    // List all files in the location's directory
    console.log(`Listing files in: ${locationPhotosPath}`);
    const [files] = await bucket.getFiles({ prefix: locationPhotosPath });
    
    console.log(`Found ${files.length} files to delete for location ${locationId}`);
    
    // If no files found, return early
    if (files.length === 0) {
      return {
        success: true,
        message: `No photos found for location ${locationId}`,
        filesDeleted: 0
      };
    }
    
    // Delete all files found
    const deletePromises = files.map(file => {
      console.log(`Deleting file: ${file.name}`);
      return file.delete();
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    console.log(`Successfully deleted ${files.length} photos for location ${locationId}`);
    
    return {
      success: true,
      message: `Successfully deleted ${files.length} photos for location ${locationId}`,
      filesDeleted: files.length
    };
  } catch (error) {
    console.error(`Error deleting photos for location ${locationId}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      message: error.message || 'Failed to delete photos'
    };
  }
}

// Main handler for the Netlify function
export default async (req, context) => {
  console.log('Background photo deletion started');
  
  try {
    // Parse request data - handle multiple formats
    let locationId;
    
    try {
      // Try to parse as JSON
      const payload = await req.json();
      locationId = payload.locationId;
      console.log('Request body parsed as JSON:', payload);
    } catch (e) {
      console.log('Could not parse request body as JSON:', e.message);
      
      // Check if context has the body
      if (context.body) {
        try {
          const contextBody = typeof context.body === 'string'
            ? JSON.parse(context.body)
            : context.body;
          locationId = contextBody.locationId;
          console.log('Using context body:', contextBody);
        } catch (contextError) {
          console.error('Error parsing context body:', contextError);
        }
      }
    }
    
    if (!locationId) {
      console.error('Missing required parameter: locationId');
      return new Response(JSON.stringify({ error: 'Missing locationId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract admin token from Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Verify admin authentication
    try {
      await verifyAdminAuth(token);
    } catch (authError) {
      console.error('Authentication failed:', authError.message);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Initialize Firebase and get Storage instance
    initializeFirebaseAdmin();
    
    // Process the location - this can continue after the function returns
    console.log(`Starting background deletion for location ID: ${locationId}`);
    
    // Use waitUntil to handle the background processing
    if (context.waitUntil) {
      context.waitUntil(
        deleteLocationPhotos(locationId)
          .then(result => {
            console.log(`Background deletion completed for ${locationId}:`, result);
          })
          .catch(error => {
            console.error(`Background deletion failed for ${locationId}:`, error);
          })
      );
    } else {
      // Fallback for environments without waitUntil (like local dev)
      console.warn('waitUntil is not available - processing may be interrupted');
      deleteLocationPhotos(locationId)
        .then(result => {
          console.log(`Background deletion completed for ${locationId}:`, result);
        })
        .catch(error => {
          console.error(`Background deletion failed for ${locationId}:`, error);
        });
    }
    
    // Return success response immediately
    return new Response(JSON.stringify({
      message: 'Photo deletion started in background',
      locationId
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error initiating background deletion:', error);
    return new Response(JSON.stringify({
      error: 'Failed to initiate background deletion',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};