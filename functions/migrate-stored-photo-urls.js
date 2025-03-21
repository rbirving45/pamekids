/**
 * Netlify Function: migrate-stored-photo-urls
 *
 * This function updates all location documents in Firestore to include storedPhotoUrls
 * which point to images already stored in Firebase Storage.
 *
 * For locations that already have properly set storedPhotoUrls, no changes are made.
 */

const { getFirestore } = require('./firebase-admin');

exports.handler = async function(event, context) {
  // Log request info for debugging
  console.log("Function invoked with method:", event.httpMethod);
  console.log("Headers:", JSON.stringify(event.headers));
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }
  
  try {
    // Verify admin authentication from request headers
    const authHeader = event.headers.authorization || '';
    const token = authHeader.split('Bearer ')[1];
    
    // TESTING ONLY: Hardcoded token fallback (REMOVE THIS FOR PRODUCTION)
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'PaMe-PaMe-2025-jU7v6Sx';
    
    if (!token || token !== ADMIN_TOKEN) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized. Admin authentication required.',
          receivedToken: token ? token.substring(0, 3) + '...' : 'none',
          tokenMatch: token === ADMIN_TOKEN
        })
      };
    }
    
    console.log('Starting migration of storedPhotoUrls for locations...');
    
    // Initialize Firestore
    const db = getFirestore();
    
    // Get all locations
    const locationsRef = db.collection('locations');
    const snapshot = await locationsRef.get();
    
    if (snapshot.empty) {
      console.log('No locations found');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No locations found', updated: 0, total: 0 })
      };
    }
    
    // HARDCODED BUCKET - Use the correct bucket name
    // This MUST match your Firebase Storage bucket name exactly
    const FIREBASE_BUCKET = 'pamekids-ab0e5.appspot.com';
    
    console.log(`Using hardcoded storage bucket: ${FIREBASE_BUCKET}`);
    
    // Track statistics
    let totalLocations = 0;
    let updatedLocations = 0;
    let errorLocations = 0;
    
    // Process each location
    const updatePromises = [];
    
    snapshot.forEach(doc => {
      totalLocations++;
      const locationData = doc.data();
      const locationId = doc.id;
      
      // Skip if location already has storedPhotoUrls
      if (locationData.placeData &&
          locationData.placeData.storedPhotoUrls &&
          locationData.placeData.storedPhotoUrls.length > 0) {
        console.log(`Location ${locationId} already has storedPhotoUrls, skipping`);
        return;
      }
      
      // Determine number of photos to generate URLs for
      // Use the count from photoUrls if available, otherwise use a default
      let photoCount = 0;
      
      if (locationData.placeData && locationData.placeData.photoUrls) {
        photoCount = locationData.placeData.photoUrls.length;
      } else {
        // Default to 10 photos if we can't determine the count
        // This is a reasonable default based on typical Google Places photos
        photoCount = 10;
      }
      
      // Don't proceed if we don't expect any photos
      if (photoCount === 0) {
        console.log(`Location ${locationId} has no photos, skipping`);
        return;
      }
      
      console.log(`Generating storedPhotoUrls for location ${locationId} with ${photoCount} photos`);
      
      // Generate storedPhotoUrls based on the expected Firebase Storage path
      const storedPhotoUrls = [];
      
      for (let i = 0; i < photoCount; i++) {
        // This should match the pattern used in image-storage-utils.js
        const filename = `location_photos/${locationId}/${i}.jpg`;
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodeURIComponent(filename)}?alt=media`;
        storedPhotoUrls.push(publicUrl);
      }
      
      // Update the Firestore document
      const updatePromise = db.collection('locations').doc(locationId).update({
        'placeData.storedPhotoUrls': storedPhotoUrls,
        'placeData_updated_at': new Date()
      })
      .then(() => {
        console.log(`Successfully updated location ${locationId} with ${storedPhotoUrls.length} storedPhotoUrls`);
        updatedLocations++;
      })
      .catch(error => {
        console.error(`Error updating location ${locationId}:`, error);
        errorLocations++;
      });
      
      updatePromises.push(updatePromise);
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    console.log(`Migration complete. Total: ${totalLocations}, Updated: ${updatedLocations}, Errors: ${errorLocations}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migration complete',
        total: totalLocations,
        updated: updatedLocations,
        errors: errorLocations
      })
    };
  } catch (error) {
    console.error('Error in migration script:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error: ' + error.message })
    };
  }
};