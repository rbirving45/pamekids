// Netlify serverless function for manual triggering of place data updates
// This is called by the admin dashboard using the "Update Photos & Ratings" button
// Now also stores permanent copies of images in Firebase Storage

const admin = require('firebase-admin');
const {
  initializeFirebaseAdmin,
  getFirestore,
  fetchAllLocations,
  fetchPlaceDetails,
  updateLocationPlaceData
} = require('./scheduled-places-update');
// We don't need to import the image storage utilities directly since they're used by updateLocationPlaceData

// Verify admin authentication
async function verifyAdminAuth(token) {
  if (!token) {
    throw new Error('Admin authentication required - no token provided');
  }
  
  // This is a simplified check - we're just validating against an environment variable
  // In a production system, you might want more robust authentication
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

// Main handler function for the Netlify serverless function
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  console.log('Manual photo update triggered from admin dashboard');
  
  // Log environment variable availability for debugging
  console.log('Environment variables check:');
  console.log('- GOOGLE_MAPS_API_KEY available:', !!process.env.GOOGLE_MAPS_API_KEY);
  console.log('- REACT_APP_GOOGLE_MAPS_API_KEY available:', !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
  console.log('- FIREBASE_SERVICE_ACCOUNT available:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('- ADMIN_TOKEN available:', !!process.env.ADMIN_TOKEN);
  
  try {
    // Extract admin token from Authorization header
    const authHeader = event.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    
    // Verify admin authentication
    await verifyAdminAuth(token);
    
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
    
    console.log(`Completed manual update: ${results.success} succeeded, ${results.failed} failed, ${results.skipped} skipped`);
    
    // Store status information for monitoring in the admin dashboard
    try {
      const statusRef = db.collection('system').doc('update_status');
      await statusRef.set({
        last_update: admin.firestore.FieldValue.serverTimestamp(),
        next_scheduled_update: new Date(Date.now() + (72 * 60 * 60 * 1000)), // 72 hours from now
        success_count: admin.firestore.FieldValue.increment(results.success),
        failed_count: admin.firestore.FieldValue.increment(results.failed),
        skipped_count: admin.firestore.FieldValue.increment(results.skipped),
        last_run_type: 'manual',
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
        message: 'Manual update completed',
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in force-places-update:', error);
    return {
      statusCode: error.message.includes('authentication') ? 401 : 500,
      body: JSON.stringify({
        error: 'Failed to run photo update',
        message: error.message
      })
    };
  }
};