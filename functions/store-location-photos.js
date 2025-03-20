/**
 * Netlify serverless function to store photos for a single location
 * This is a simplified version of migrate-new-photos.js that processes only one location
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
async function processLocation(db, locationId) {
  try {
    if (!locationId) {
      throw new Error('Location ID is required');
    }
    
    // Get the location from Firestore
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
        'updated_at': admin.firestore.FieldValue.serverTimestamp(),
        'placeData_updated_at': admin.firestore.FieldValue.serverTimestamp()
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

// Main handler for the Netlify function
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('Single location photo storage triggered');
  
  try {
    // Parse the request body
    const payload = JSON.parse(event.body);
    const { locationId } = payload;
    
    if (!locationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameters',
          message: 'locationId is required'
        })
      };
    }
    
    // Extract admin token from Authorization header
    const authHeader = event.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Verify admin authentication
    await verifyAdminAuth(token);
    
    // Initialize Firebase and get Firestore instance
    const db = getFirestore();
    
    // Process the location
    const result = await processLocation(db, locationId);
    
    if (!result.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to process location photos',
          message: result.message || result.error || 'Unknown error',
          details: result
        })
      };
    }
    
    // Return success with results
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: result.message || 'Photos processed successfully',
        result
      })
    };
  } catch (error) {
    console.error('Error processing photos:', error);
    return {
      statusCode: error.message.includes('authentication') ? 401 : 500,
      body: JSON.stringify({
        error: 'Failed to process photos',
        message: error.message
      })
    };
  }
};