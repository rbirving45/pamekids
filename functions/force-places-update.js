// Netlify serverless function for manual triggering of place data updates
// This is called by the admin dashboard using the "Update Photos & Ratings" button

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Import the same helper functions from the scheduled update file
const {
  initializeFirebaseAdmin,
  getFirestore,
  fetchAllLocations,
  fetchPlaceDetails,
  updateLocationPlaceData
} = require('./scheduled-places-update');

// Verify admin authentication
async function verifyAdminAuth(token) {
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  // This is a simplified check - implement your actual admin auth verification here
  // For example, validate against a known admin token or use Firebase Auth
  if (token !== process.env.ADMIN_TOKEN) {
    throw new Error('Invalid admin token');
  }
  
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