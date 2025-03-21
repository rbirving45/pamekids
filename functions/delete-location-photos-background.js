/**
 * Netlify serverless BACKGROUND function to delete photos for a single location
 * This function removes all photos associated with a location from Firebase Storage
 * when the location is deleted from Firestore.
 *
 * Named with -background suffix to follow Netlify's background function naming convention
 * This allows it to run for up to 15 minutes instead of the 10-second limit
 */

const { initializeFirebaseAdmin, getStorage } = require('./firebase-admin');

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
    const storage = getStorage();
    
    // Get bucket with explicit hardcoded bucket name
    const bucket = storage.bucket(FIREBASE_BUCKET);
    
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
exports.handler = async (event, context) => {
  // This is a background function, so it doesn't need to return a response immediately
  console.log('Background photo deletion started');
  
  try {
    // Parse the request body
    const payload = JSON.parse(event.body);
    const { locationId } = payload;
    
    if (!locationId) {
      console.error('Missing required parameter: locationId');
      return { statusCode: 400 };
    }
    
    // Extract admin token from Authorization header
    const authHeader = event.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Verify admin authentication
    try {
      await verifyAdminAuth(token);
    } catch (authError) {
      console.error('Authentication failed:', authError.message);
      return { statusCode: 401 };
    }
    
    // Initialize Firebase and get Storage instance - will continue in the background
    const storage = getStorage();
    
    // Process the location - this can continue after the function returns
    console.log(`Starting background deletion for location ID: ${locationId}`);
    
    // Return immediately with 202 Accepted
    // Processing will continue in the background
    deleteLocationPhotos(locationId)
      .then(result => {
        console.log(`Background deletion completed for ${locationId}:`, result);
      })
      .catch(error => {
        console.error(`Background deletion failed for ${locationId}:`, error);
      });
    
    // Return success right away
    return {
      statusCode: 202, // Accepted
      body: JSON.stringify({
        message: 'Photo deletion started in background',
        locationId
      })
    };
  } catch (error) {
    console.error('Error initiating background deletion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initiate background deletion',
        message: error.message
      })
    };
  }
};