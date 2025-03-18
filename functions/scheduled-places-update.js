// Netlify serverless function for scheduled updates of place data
// This function updates photo URLs, ratings and review counts every 72 hours
// without modifying other location data

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Firebase Admin initialization
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

// Function to fetch all locations from Firestore
async function fetchAllLocations(db) {
  try {
    // Get all documents from the locations collection
    const locationsRef = db.collection('locations');
    const snapshot = await locationsRef.get();
    
    if (snapshot.empty) {
      console.log('No locations found in Firestore');
      return [];
    }
    
    // Process each location document
    const locations = [];
    snapshot.forEach(doc => {
      const location = doc.data();
      locations.push({
        id: doc.id,
        name: location.name || 'Unknown location',
        placeId: doc.id, // Using the document ID as the Google Place ID
        coordinates: location.coordinates || { lat: 0, lng: 0 },
        // Only include fields we need for identification and updating
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

// Function to fetch place details from Google Places API
async function fetchPlaceDetails(placeId) {
  try {
    // Google Places API endpoint - try different environment variable formats
    // Netlify functions might access variables differently than React app
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key is missing - check environment variables');
      throw new Error('Google Places API key is missing. Check both GOOGLE_MAPS_API_KEY and REACT_APP_GOOGLE_MAPS_API_KEY in your environment.');
    }
    
    // Only request the fields we need to update
    const fields = 'photos,rating,user_ratings_total';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || 'No error message'}`);
    }
    
    return data.result;
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error);
    return null;
  }
}

// Function to update only specific fields (photoUrls, rating, userRatingsTotal) in Firestore
async function updateLocationPlaceData(db, locationId, placeDetails) {
  try {
    if (!placeDetails) {
      console.log(`No place details to update for ${locationId}`);
      return false;
    }
    
    // Extract only the fields we want to update
    const updateData = {};
    
    // 1. Process photos
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      // Get API key - try different environment variable formats
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Cannot generate photo URLs: Google Maps API key is missing');
        return false;
      }
      
      // Generate photo URLs
      const photoUrls = placeDetails.photos.slice(0, 10).map(photo => {
        const reference = photo.photo_reference;
        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${apiKey}`;
      });
      
      // Only add to update if we have valid URLs
      if (photoUrls.length > 0) {
        updateData['placeData.photoUrls'] = photoUrls;
      }
    }
    
    // 2. Update rating if available
    if (typeof placeDetails.rating === 'number') {
      updateData['placeData.rating'] = placeDetails.rating;
    }
    
    // 3. Update user ratings count if available
    if (typeof placeDetails.user_ratings_total === 'number') {
      updateData['placeData.userRatingsTotal'] = placeDetails.user_ratings_total;
    }
    
    // Only proceed with update if we have data to update
    if (Object.keys(updateData).length === 0) {
      console.log(`No data to update for ${locationId}`);
      return false;
    }
    
    // Add last fetched timestamp
    updateData['placeData.last_fetched'] = admin.firestore.FieldValue.serverTimestamp();
    updateData['placeData_updated_at'] = admin.firestore.FieldValue.serverTimestamp();
    
    // Perform update ONLY on the specified fields
    await db.collection('locations').doc(locationId).update(updateData);
    
    console.log(`Updated place data for ${locationId} with fields: ${Object.keys(updateData).join(', ')}`);
    return true;
  } catch (error) {
    console.error(`Error updating place data for ${locationId}:`, error);
    return false;
  }
}

// Main handler function for the Netlify serverless function
exports.handler = async (event, context) => {
  // Check if this is a scheduled event
  const isScheduledEvent = event.headers && event.headers['x-netlify-scheduled'];
  console.log(`Starting places update... (Triggered by: ${isScheduledEvent ? 'schedule' : 'manual request'})`);
  
  // Log environment variable availability for debugging
  console.log('Environment variables check:');
  console.log('- GOOGLE_MAPS_API_KEY available:', !!process.env.GOOGLE_MAPS_API_KEY);
  console.log('- REACT_APP_GOOGLE_MAPS_API_KEY available:', !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
  console.log('- FIREBASE_SERVICE_ACCOUNT available:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('- ADMIN_TOKEN available:', !!process.env.ADMIN_TOKEN);
  
  try {
    // Initialize Firebase
    const db = getFirestore();
    
    // Fetch all locations from Firestore
    const locations = await fetchAllLocations(db);
    
    if (locations.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No locations to update',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    console.log(`Processing ${locations.length} locations...`);
    
    // Record starting time for performance tracking
    const startTime = Date.now();
    
    // Track success and failure counts
    const results = {
      success: 0,
      failed: 0,
      skipped: 0
    };
    
    // Process locations in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      // Process each location in the batch
      const batchPromises = batch.map(async (location) => {
        try {
          // Fetch place details from Google Places API
          const placeDetails = await fetchPlaceDetails(location.id);
          
          if (!placeDetails) {
            console.log(`Skipping location ${location.id} (${location.name}) - could not fetch place details`);
            results.skipped++;
            return;
          }
          
          // Update only specific fields in Firestore
          const success = await updateLocationPlaceData(db, location.id, placeDetails);
          
          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Error processing location ${location.id} (${location.name}):`, error);
          results.failed++;
        }
      });
      
      // Wait for all locations in this batch to be processed
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Completed scheduled update: ${results.success} succeeded, ${results.failed} failed, ${results.skipped} skipped`);
    
    // Store status information for monitoring in the admin dashboard
    try {
      const statusRef = db.collection('system').doc('update_status');
      await statusRef.set({
        last_update: admin.firestore.FieldValue.serverTimestamp(),
        next_scheduled_update: new Date(Date.now() + (72 * 60 * 60 * 1000)), // 72 hours from now
        success_count: admin.firestore.FieldValue.increment(results.success),
        failed_count: admin.firestore.FieldValue.increment(results.failed),
        skipped_count: admin.firestore.FieldValue.increment(results.skipped),
        last_run_type: isScheduledEvent ? 'scheduled' : 'manual',
        info: {
          total_locations: locations.length,
          timestamp: new Date().toISOString(),
          duration_minutes: ((Date.now() - startTime) / 60000).toFixed(2)
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error updating status document:', error);
      // Don't fail the entire function if just status update fails
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled update completed',
        results,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in scheduled places update:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to run scheduled update',
        message: error.message
      })
    };
  }
};

// Export helper functions so they can be reused by other functions
module.exports = {
  initializeFirebaseAdmin,
  getFirestore,
  fetchAllLocations,
  fetchPlaceDetails,
  updateLocationPlaceData
};