/**
 * Netlify serverless function to migrate photos for locations without stored photos
 * This function:
 * 1. Fetches fresh photo references directly from Google Places API
 * 2. Generates new photo URLs with the API key
 * 3. Downloads and stores the photos in Firebase Storage
 * 4. Updates Firestore with the permanent URLs
 */

const { initializeFirebaseAdmin, getFirestore } = require('./firebase-admin');
const { processAndStoreLocationPhotos } = require('./image-storage-utils');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

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

// Track stats for the migration
const getEmptyStats = () => ({
  totalLocations: 0,
  processedLocations: 0,
  totalPhotos: 0,
  storedPhotos: 0,
  skippedLocations: 0,
  failedLocations: 0,
  refreshedPhotoUrls: 0
});

// Migration configuration
const CONFIG = {
  batchSize: 3,          // Reduced batch size to avoid timeouts
  delayBetweenBatches: 3000,  // Increased delay between batches
  maxPhotosPerLocation: 10,   // Maximum number of photos to store per location
  maxProcessingTime: 250000   // 250 seconds max processing time
};

/**
 * Fetch all locations from Firestore
 */
async function fetchAllLocations(db) {
  try {
    const locationsRef = db.collection('locations');
    const snapshot = await locationsRef.get();
    
    if (snapshot.empty) {
      console.log('No locations found in Firestore');
      return [];
    }
    
    const locations = [];
    snapshot.forEach(doc => {
      const location = doc.data();
      locations.push({
        id: doc.id,
        name: location.name || 'Unknown location',
        placeData: location.placeData || {}
      });
    });
    
    console.log(`Fetched ${locations.length} locations from Firestore`);
    return locations;
  } catch (error) {
    console.error('Error fetching locations from Firestore:', error);
    throw error;
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
  
  // Take up to CONFIG.maxPhotosPerLocation photos
  return photoReferences.slice(0, CONFIG.maxPhotosPerLocation).map(photo => {
    const reference = photo.photo_reference;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${apiKey}`;
  });
}

/**
 * Process a single location's photos
 */
async function processLocation(db, location) {
  try {
    const { id, name, placeData } = location;
    
    // Skip locations that already have stored photos
    if (placeData?.storedPhotoUrls && placeData.storedPhotoUrls.length > 0) {
      console.log(`Location ${name} (${id}) already has stored photos. Skipping.`);
      return { success: false, skipped: true };
    }
    
    // Get the API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      return {
        success: false,
        processed: false,
        failed: true,
        reason: 'missing_api_key'
      };
    }
    
    // Fetch fresh photo references from Google Places API
    const photoReferences = await fetchPlacePhotos(id);
    
    // Handle error or no photos
    if (!photoReferences) {
      console.log(`Failed to fetch photos for location ${name} (${id}). Skipping.`);
      return {
        success: false,
        processed: true,
        failed: true,
        reason: 'failed_to_fetch_photos'
      };
    }
    
    if (photoReferences.length === 0) {
      console.log(`Location ${name} (${id}) has no photos available from Google Places API. Skipping.`);
      return {
        success: false,
        processed: true,
        reason: 'no_photos_available'
      };
    }
    
    // Generate photo URLs from references
    const freshPhotoUrls = generatePhotoUrls(photoReferences, apiKey);
    
    if (freshPhotoUrls.length === 0) {
      console.log(`No valid photo URLs generated for location ${name} (${id}). Skipping.`);
      return {
        success: false,
        processed: true,
        reason: 'no_valid_urls'
      };
    }
    
    console.log(`Processing ${freshPhotoUrls.length} photos for location ${name} (${id})`);
    
    // Store photo references for attribution
    const photoRefs = photoReferences.slice(0, CONFIG.maxPhotosPerLocation).map(photo => photo.photo_reference);
    
    // Try to download and store photos
    let storedUrls = [];
    let storageError = null;
    
    try {
      // Attempt to process and store to Firebase Storage
      storedUrls = await processAndStoreLocationPhotos(id, freshPhotoUrls);
    } catch (error) {
      console.error(`Error storing photos for ${name} (${id}):`, error);
      storageError = error.message || 'Unknown storage error';
    }
    
    // Update Firestore with the fresh Google URLs and any stored URLs (if successful)
    try {
      const docRef = db.collection('locations').doc(id);
      
      // Get current placeData to preserve existing fields
      const docSnap = await docRef.get();
      const existingPlaceData = docSnap.exists ? (docSnap.data().placeData || {}) : {};
      
      // Prepare update data
      const updateData = {
        'placeData': {
          ...existingPlaceData,
          photoUrls: freshPhotoUrls,            // Update with fresh Google URLs
          photoReferences: photoRefs,            // Store references for attribution
          last_fetched: new Date().toISOString()
        },
        'updated_at': admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Only add storedPhotoUrls if we have any
      if (storedUrls && storedUrls.length > 0) {
        updateData.placeData.storedPhotoUrls = storedUrls;
        updateData.migrated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Update Firestore
      await docRef.update(updateData);
      
      if (storedUrls && storedUrls.length > 0) {
        console.log(`Updated location ${name} (${id}) with ${storedUrls.length} permanent URLs`);
        return {
          success: true,
          processed: true,
          photoCount: freshPhotoUrls.length,
          storedCount: storedUrls.length,
          refreshedUrls: true,
          storageSuccess: true
        };
      } else {
        console.log(`Updated location ${name} (${id}) with ${freshPhotoUrls.length} Google URLs (Firebase Storage failed: ${storageError})`);
        return {
          success: true,
          processed: true,
          photoCount: freshPhotoUrls.length,
          storedCount: 0,
          refreshedUrls: true,
          storageSuccess: false,
          storageError: storageError
        };
      }
    } catch (updateError) {
      console.error(`Error updating Firestore for ${name} (${id}):`, updateError);
      return {
        success: false,
        processed: true,
        failed: true,
        reason: updateError.message || 'firestore_update_failed',
        photoCount: freshPhotoUrls.length,
        storedCount: 0
      };
    }
  } catch (error) {
    console.error(`Error processing location ${location.id}:`, error);
    return {
      success: false,
      processed: true,
      failed: true,
      reason: error.message || 'unknown_error'
    };
  }
}

// Main handler for the Netlify function
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('Photo migration triggered from admin dashboard');
  
  // Check if GOOGLE_MAPS_API_KEY is set - critical for this function
  if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY or REACT_APP_GOOGLE_MAPS_API_KEY is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Configuration error',
        message: 'Google Maps API key is missing. Please check your environment variables.'
      })
    };
  }
  
  try {
    // Extract admin token from Authorization header
    const authHeader = event.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Verify admin authentication
    await verifyAdminAuth(token);
    
    // Initialize stats
    const stats = getEmptyStats();
    
    // Record starting time
    const startTime = Date.now();
    const endTime = startTime + CONFIG.maxProcessingTime;
    
    // Initialize Firebase and get Firestore instance
    const db = getFirestore();
    
    // Fetch all locations
    const locations = await fetchAllLocations(db);
    stats.totalLocations = locations.length;
    
    if (locations.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No locations to process',
          stats
        })
      };
    }
    
    // Process locations in batches with time limit
    for (let i = 0; i < locations.length; i += CONFIG.batchSize) {
      // Check if we're approaching the time limit
      if (Date.now() > endTime - 30000) { // 30 seconds before timeout
        console.log('Approaching time limit, stopping processing');
        break;
      }
      
      const batch = locations.slice(i, i + CONFIG.batchSize);
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(locations.length / CONFIG.batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}`);
      
      // Process each location in the batch in parallel
      const batchResults = await Promise.all(
        batch.map(location => processLocation(db, location))
      );
      
      // Update stats based on results
      batchResults.forEach(result => {
        if (result.skipped) {
          stats.skippedLocations++;
        } else if (result.processed) {
          stats.processedLocations++;
          if (result.failed) {
            stats.failedLocations++;
          }
          if (result.photoCount) {
            stats.totalPhotos += result.photoCount;
          }
          if (result.storedCount) {
            stats.storedPhotos += result.storedCount;
          }
          if (result.refreshedUrls) {
            stats.refreshedPhotoUrls++;
          }
        }
      });
      
      // Check if we've reached the time limit
      if (Date.now() > endTime - 15000) { // 15 seconds before timeout
        console.log('Time limit reached, stopping processing');
        break;
      }
      
      // Add a delay between batches
      if (i + CONFIG.batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
      }
    }
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Print summary to logs
    console.log('\n========== MIGRATION COMPLETE ==========');
    console.log(`Total locations: ${stats.totalLocations}`);
    console.log(`Successfully processed: ${stats.processedLocations}`);
    console.log(`Skipped locations: ${stats.skippedLocations}`);
    console.log(`Failed locations: ${stats.failedLocations}`);
    console.log(`Total photos: ${stats.totalPhotos}`);
    console.log(`Successfully stored photos: ${stats.storedPhotos}`);
    console.log(`Photo URLs refreshed: ${stats.refreshedPhotoUrls}`);
    console.log(`Time taken: ${duration} seconds`);
    console.log('=========================================');
    
    // Update migration status in Firestore
    try {
      const statusRef = db.collection('system').doc('migration_status');
      await statusRef.set({
        last_migration: admin.firestore.FieldValue.serverTimestamp(),
        stats: stats,
        duration_seconds: Number(duration),
        completed: Date.now() > endTime - 30000 ? 'partial' : 'full'
      }, { merge: true });
      console.log('Migration status saved to Firestore');
    } catch (error) {
      console.error('Error saving migration status:', error);
    }
    
    // Return success with stats
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Photo migration completed',
        complete: Date.now() > endTime - 30000 ? false : true,
        stats,
        duration
      })
    };
  } catch (error) {
    console.error('Error in photo migration:', error);
    return {
      statusCode: error.message.includes('authentication') ? 401 : 500,
      body: JSON.stringify({
        error: 'Failed to run photo migration',
        message: error.message
      })
    };
  }
};