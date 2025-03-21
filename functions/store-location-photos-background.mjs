/**
 * Netlify serverless BACKGROUND function to store photos for a single location
 * Using ES Module format for Netlify background function compatibility
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Firebase initialization for ES modules
let firebaseApp;
let db;
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

// Get Firestore instance
function getFirestoreInstance() {
  if (db) {
    return db;
  }
  
  try {
    const app = initializeFirebaseAdmin();
    db = app.firestore();
    return db;
  } catch (error) {
    console.error('Error getting Firestore instance:', error);
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
 * Process and store photos for a location
 */
async function processAndStoreLocationPhotos(locationId, photoUrls) {
  if (!locationId || !photoUrls || photoUrls.length === 0) {
    return [];
  }

  try {
    console.log(`Processing ${photoUrls.length} photos for location ${locationId}`);
    
    // Get Storage instance
    const bucket = getStorageInstance();
    
    // Create a directory for the location's photos
    const locationDir = `location_photos/${locationId}`;
    
    // Array to hold the URLs of the stored photos
    const storedUrls = [];
    
    // Process each photo URL
    for (let i = 0; i < photoUrls.length; i++) {
      const photoUrl = photoUrls[i];
      
      try {
        console.log(`Downloading photo ${i + 1}/${photoUrls.length} from ${photoUrl.substring(0, 100)}...`);
        
        // Download the photo
        const response = await fetch(photoUrl);
        
        if (!response.ok) {
          console.warn(`Failed to download photo ${i + 1}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        // Get the photo as a buffer
        const photoBuffer = await response.buffer();
        
        // Generate a unique filename
        const filename = `${locationDir}/photo_${i + 1}_${Date.now()}.jpg`;
        
        console.log(`Uploading photo to ${filename}`);
        
        // Upload the photo to Firebase Storage
        const file = bucket.file(filename);
        await file.save(photoBuffer, {
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000'
          }
        });
        
        // Make the photo publicly accessible
        await file.makePublic();
        
        // Get the public URL of the photo
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        storedUrls.push(publicUrl);
        
        console.log(`Photo ${i + 1} stored at ${publicUrl}`);
      } catch (photoError) {
        console.error(`Error processing photo ${i + 1}:`, photoError);
      }
    }
    
    console.log(`Stored ${storedUrls.length} photos for location ${locationId}`);
    return storedUrls;
  } catch (error) {
    console.error(`Error storing photos for location ${locationId}:`, error);
    return [];
  }
}

/**
 * Fetch fresh photo references from Google Places API
 */
async function fetchPlacePhotos(placeId) {
  try {
    if (!placeId) {
      console.warn('Missing placeId for fetching photos');
      return null;
    }
    
    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      throw new Error('Google Maps API key is missing. Check environment variables.');
    }
    
    // Fields to fetch from Google Places API
    const fields = 'photos';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    
    console.log(`Fetching fresh photo references for ${placeId} from Google Places API`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || 'No error message'}`);
    }
    
    // Check if the place has photos
    if (!data.result || !data.result.photos || !data.result.photos.length) {
      console.log(`No photos found for place ${placeId}`);
      return [];
    }
    
    // Return the photo references
    return data.result.photos;
  } catch (error) {
    console.error(`Error fetching place photos for ${placeId}:`, error);
    return null;
  }
}

/**
 * Generate photo URLs from photo references
 */
function generatePhotoUrls(photoReferences, apiKey) {
  if (!photoReferences || !photoReferences.length || !apiKey) {
    return [];
  }
  
  // Take up to 10 photos
  return photoReferences.slice(0, 10).map(photo => {
    const reference = photo.photo_reference;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${apiKey}`;
  });
}

/**
 * Process a single location's photos
 */
async function processLocation(locationId) {
  try {
    if (!locationId) {
      throw new Error('Location ID is required');
    }
    
    // Get the location from Firestore
    const db = getFirestoreInstance();
    const docRef = db.collection('locations').doc(locationId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error(`Location not found: ${locationId}`);
    }
    
    const location = docSnap.data();
    const { name } = location;
    
    console.log(`Processing photos for location: ${name} (${locationId})`);
    
    // Skip if the location already has stored photos
    if (location.placeData?.storedPhotoUrls && location.placeData.storedPhotoUrls.length > 0) {
      console.log(`Location ${name} (${locationId}) already has stored photos. Skipping.`);
      return {
        success: true,
        message: 'Location already has stored photos',
        skipped: true
      };
    }
    
    // Get the API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is missing');
    }
    
    // Fetch fresh photo references from Google Places API
    const photoReferences = await fetchPlacePhotos(locationId);
    
    // Handle error or no photos
    if (!photoReferences) {
      throw new Error(`Failed to fetch photos for location ${name} (${locationId})`);
    }
    
    if (photoReferences.length === 0) {
      console.log(`Location ${name} (${locationId}) has no photos available from Google Places API.`);
      return {
        success: true,
        processed: true,
        photoCount: 0,
        message: 'No photos available for this location'
      };
    }
    
    // Generate photo URLs from references
    const freshPhotoUrls = generatePhotoUrls(photoReferences, apiKey);
    
    if (freshPhotoUrls.length === 0) {
      console.log(`No valid photo URLs generated for location ${name} (${locationId}).`);
      return {
        success: true,
        processed: true,
        photoCount: 0,
        message: 'No valid photo URLs could be generated'
      };
    }
    
    console.log(`Processing ${freshPhotoUrls.length} photos for location ${name} (${locationId})`);
    
    // Store photo references for attribution
    const photoRefs = photoReferences.slice(0, 10).map(photo => photo.photo_reference);
    
    // Try to download and store photos
    let storedUrls = [];
    
    try {
      // Attempt to process and store to Firebase Storage
      storedUrls = await processAndStoreLocationPhotos(locationId, freshPhotoUrls);
      
      if (!storedUrls || storedUrls.length === 0) {
        throw new Error('Failed to store photos in Firebase Storage');
      }
    } catch (error) {
      console.error(`Error storing photos for ${name} (${locationId}):`, error);
      throw error;
    }
    
    // Update Firestore with the stored URLs
    try {
      // Get current placeData to preserve existing fields
      const existingPlaceData = location.placeData || {};
      
      // Prepare update data
      const updateData = {
        'placeData': {
          ...existingPlaceData,
          photoUrls: freshPhotoUrls,          // Update with fresh Google URLs
          photoReferences: photoRefs,          // Store references for attribution
          storedPhotoUrls: storedUrls,         // Add permanent stored URLs
          last_fetched: new Date().toISOString()
        },
        'updated_at': FieldValue.serverTimestamp(),
        'placeData_updated_at': FieldValue.serverTimestamp()
      };
      
      // Update Firestore
      await docRef.update(updateData);
      
      console.log(`Updated location ${name} (${locationId}) with ${storedUrls.length} permanent URLs`);
      
      return {
        success: true,
        processed: true,
        photoCount: freshPhotoUrls.length,
        storedCount: storedUrls.length,
        message: `Successfully stored ${storedUrls.length} photos`
      };
    } catch (updateError) {
      console.error(`Error updating Firestore for ${name} (${locationId}):`, updateError);
      throw updateError;
    }
  } catch (error) {
    console.error(`Error processing location ${locationId}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      message: error.message || 'Failed to process photos'
    };
  }
}

// Main handler for the Netlify background function
export default async (req, context) => {
  console.log('Background photo processing started');
  
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
    
    // This ensures Firebase is initialized for background processing
    initializeFirebaseAdmin();
    
    // Return immediate response
    console.log(`Starting background processing for location ID: ${locationId}`);
    
    // Use waitUntil to handle the background processing
    if (context.waitUntil) {
      context.waitUntil(
        processLocation(locationId)
          .then(result => {
            console.log(`Background processing completed for ${locationId}:`, result);
          })
          .catch(error => {
            console.error(`Background processing failed for ${locationId}:`, error);
          })
      );
    } else {
      // Fallback for environments without waitUntil (like local dev)
      console.warn('waitUntil is not available - processing may be interrupted');
      processLocation(locationId)
        .then(result => {
          console.log(`Background processing completed for ${locationId}:`, result);
        })
        .catch(error => {
          console.error(`Background processing failed for ${locationId}:`, error);
        });
    }
    
    // Return success response immediately
    return new Response(JSON.stringify({
      message: 'Photo processing started in background',
      locationId
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error initiating background processing:', error);
    return new Response(JSON.stringify({
      error: 'Failed to initiate background processing',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};