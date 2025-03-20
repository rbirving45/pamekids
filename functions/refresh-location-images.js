// Netlify serverless function to refresh images for a single location
// This function fetches fresh photo URLs from Google Places API for a specific location ID
// and uploads permanent copies to Firebase Storage

const { initializeFirebaseAdmin, getFirestore, fetchPlaceDetails } = require('./scheduled-places-update');
const admin = require('firebase-admin');
const { processAndStoreLocationPhotos } = require('./image-storage-utils');

// In-memory rate limiting for non-admin requests (resets on function cold start)
const ipRateLimits = {};
const RATE_LIMIT_MAX = 10; // Max requests per IP per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Verify authentication for requests
async function verifyAccess(token, clientIp) {
  // If admin token is provided and valid, grant full admin privileges
  if (token) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken && token === adminToken) {
      console.log('Admin authentication successful');
      return { isAdmin: true };
    } else {
      console.warn('Invalid admin token provided');
    }
  }
  
  // For non-admin requests, implement basic rate limiting by IP
  if (!clientIp) {
    console.warn('No client IP available for rate limiting');
    clientIp = 'unknown';
  }
  
  // Initialize or clean up the rate limit entry for this IP
  if (!ipRateLimits[clientIp]) {
    ipRateLimits[clientIp] = {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
    };
  } else if (ipRateLimits[clientIp].resetTime < Date.now()) {
    // Reset counter if the window has passed
    ipRateLimits[clientIp] = {
      count: 0,
      resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
    };
  }
  
  // Check if rate limit is exceeded
  if (ipRateLimits[clientIp].count >= RATE_LIMIT_MAX) {
    const resetInMinutes = Math.ceil((ipRateLimits[clientIp].resetTime - Date.now()) / (60 * 1000));
    console.warn(`Rate limit exceeded for IP ${clientIp}. Reset in ${resetInMinutes} minutes`);
    throw new Error(`Rate limit exceeded. Please try again later (resets in approximately ${resetInMinutes} minutes).`);
  }
  
  // Increment the request counter
  ipRateLimits[clientIp].count++;
  
  console.log(`Public access granted for IP ${clientIp} (${ipRateLimits[clientIp].count}/${RATE_LIMIT_MAX} requests)`);
  return { isAdmin: false };
}

// Update photo URLs, rating, and user ratings count for a specific location
// Also downloads and stores images permanently in Firebase Storage
async function updateLocationImages(db, locationId, placeDetails) {
  try {
    if (!placeDetails) {
      console.log(`No place details available for ${locationId}`);
      return { success: false, reason: 'No place details available' };
    }
    
    // Extract only the fields we want to update
    const updateData = {};
    
    // 1. Process photos
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      // Get API key from the environment
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Cannot generate photo URLs: Google Maps API key is missing');
        return { success: false, reason: 'API key missing' };
      }
      
      // Generate photo URLs from Google Places API
      const photoUrls = placeDetails.photos.slice(0, 10).map(photo => {
        const reference = photo.photo_reference;
        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${apiKey}`;
      });
      
      // Only add to update if we have valid URLs
      if (photoUrls.length > 0) {
        updateData['placeData.photoUrls'] = photoUrls;
        
        // Store photo references for attribution
        const photoReferences = placeDetails.photos.slice(0, 10).map(photo => photo.photo_reference);
        updateData['placeData.photoReferences'] = photoReferences;
        
        // Process and store permanent copies in Firebase Storage
        console.log(`Downloading and storing ${photoUrls.length} images for location ${locationId}`);
        try {
          const storedUrls = await processAndStoreLocationPhotos(locationId, photoUrls);
          
          // Add the permanent URLs to the update if we have any
          if (storedUrls && storedUrls.length > 0) {
            updateData['placeData.storedPhotoUrls'] = storedUrls;
            console.log(`Successfully stored ${storedUrls.length} permanent images in Firebase Storage`);
          }
        } catch (storageError) {
          console.error(`Error storing images for ${locationId}:`, storageError);
          // Continue with the update even if storage fails
          // The original photoUrls will still be available as a fallback
        }
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
      return { success: false, reason: 'No new data available' };
    }
    
    // Add last fetched timestamp
    updateData['placeData.last_fetched'] = admin.firestore.FieldValue.serverTimestamp();
    updateData['placeData_updated_at'] = admin.firestore.FieldValue.serverTimestamp();
    
    // Perform update ONLY on the specified fields
    await db.collection('locations').doc(locationId).update(updateData);
    
    console.log(`Updated images for ${locationId} with fields: ${Object.keys(updateData).join(', ')}`);
    return {
      success: true,
      updated: Object.keys(updateData).length,
      photoCount: updateData['placeData.photoUrls']?.length || 0
    };
  } catch (error) {
    console.error(`Error updating place data for ${locationId}:`, error);
    return {
      success: false,
      reason: error.message || 'Unknown error'
    };
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  // Parse request body
  let locationId, adminToken;
  try {
    const payload = JSON.parse(event.body);
    locationId = payload.locationId;
    adminToken = payload.adminToken; // Optional - for admin access
    
    if (!locationId) {
      throw new Error('Missing required parameter: locationId');
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid request',
        message: error.message || 'Could not parse request body'
      })
    };
  }
  
  try {
    // Get client IP for rate limiting
    const clientIp = event.headers['client-ip'] ||
                    event.headers['x-forwarded-for'] ||
                    context.clientContext?.ip ||
                    'unknown';
    
    // Validate authentication and apply rate limiting
    const authResult = await verifyAccess(adminToken, clientIp);
    
    // Log the request
    console.log(`Image refresh requested for location ${locationId} (${authResult.isAdmin ? 'admin' : 'public'})`);
    
    // Initialize Firebase
    const db = getFirestore();
    
    // Fetch fresh place details from Google Places API
    const placeDetails = await fetchPlaceDetails(locationId);
    
    if (!placeDetails) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Not found',
          message: 'Could not fetch place details for the provided location ID'
        })
      };
    }
    
    // Update Firestore with fresh data
    const result = await updateLocationImages(db, locationId, placeDetails);
    
    // Update status information
    try {
      const statusRef = db.collection('system').doc('update_status');
      await statusRef.set({
        last_single_update: admin.firestore.FieldValue.serverTimestamp(),
        success_count: admin.firestore.FieldValue.increment(result.success ? 1 : 0),
        failed_count: admin.firestore.FieldValue.increment(result.success ? 0 : 1),
        info: {
          recent_requests: admin.firestore.FieldValue.arrayUnion({
            locationId,
            timestamp: new Date().toISOString(),
            success: result.success,
            source: authResult.isAdmin ? 'admin' : 'client',
            ip: clientIp.split(',')[0].trim() // Store only the first IP if multiple are provided
          })
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error updating status document:', error);
      // Don't fail the entire function if just status update fails
    }
    
    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify({
        success: result.success,
        locationId,
        ...result
      })
    };
  } catch (error) {
    console.error('Error in refresh-location-images:', error);
    return {
      statusCode: error.message.includes('Rate limit') ? 429 :
                 error.message.includes('authentication') ? 401 : 500,
      body: JSON.stringify({
        error: 'Failed to refresh images',
        message: error.message
      })
    };
  }
};