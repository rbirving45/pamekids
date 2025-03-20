/**
 * One-time migration script to move all location photos to Firebase Storage
 * This script:
 * 1. Fetches all locations from Firestore
 * 2. For each location, downloads all photo URLs from Google Places API
 * 3. Uploads them to Firebase Storage
 * 4. Updates the Firestore documents with permanent URLs
 */

const { initializeFirebaseAdmin, getFirestore } = require('./firebase-admin');
const { processAndStoreLocationPhotos } = require('./image-storage-utils');
const admin = require('firebase-admin');

// Track stats for the migration
const stats = {
  totalLocations: 0,
  processedLocations: 0,
  totalPhotos: 0,
  storedPhotos: 0,
  skippedLocations: 0,
  failedLocations: 0
};

// Migration configuration
const CONFIG = {
  batchSize: 5,          // Number of locations to process in parallel
  delayBetweenBatches: 2000,  // Milliseconds to wait between batches
  maxPhotosPerLocation: 10     // Maximum number of photos to store per location
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
 * Process a single location's photos
 */
async function processLocation(db, location) {
  try {
    const { id, name, placeData } = location;
    
    // Skip locations that already have stored photos
    if (placeData?.storedPhotoUrls && placeData.storedPhotoUrls.length > 0) {
      console.log(`Location ${name} (${id}) already has stored photos. Skipping.`);
      stats.skippedLocations++;
      return false;
    }
    
    // Use existing photoUrls if available
    const photoUrls = placeData?.photoUrls || [];
    if (photoUrls.length === 0) {
      console.log(`Location ${name} (${id}) has no photos to migrate. Skipping.`);
      stats.skippedLocations++;
      return false;
    }
    
    // Limit number of photos to process
    const photosToProcess = photoUrls.slice(0, CONFIG.maxPhotosPerLocation);
    stats.totalPhotos += photosToProcess.length;
    
    console.log(`Processing ${photosToProcess.length} photos for location ${name} (${id})`);
    
    // Download and store photos
    const storedUrls = await processAndStoreLocationPhotos(id, photosToProcess);
    stats.storedPhotos += storedUrls.length;
    
    // Update Firestore with permanent URLs
    if (storedUrls.length > 0) {
      const docRef = db.collection('locations').doc(id);
      
      await docRef.update({
        'placeData.storedPhotoUrls': storedUrls,
        'migrated_at': admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Updated location ${name} (${id}) with ${storedUrls.length} permanent URLs`);
      return true;
    } else {
      console.warn(`Failed to store any photos for location ${name} (${id})`);
      stats.failedLocations++;
      return false;
    }
  } catch (error) {
    console.error(`Error processing location ${location.id}:`, error);
    stats.failedLocations++;
    return false;
  }
}

/**
 * Main migration function
 */
async function migratePhotosToStorage() {
  console.log('Starting photo migration to Firebase Storage...');
  const startTime = Date.now();
  
  try {
    // Initialize Firebase
    const db = getFirestore();
    
    // Fetch all locations
    const locations = await fetchAllLocations(db);
    stats.totalLocations = locations.length;
    
    if (locations.length === 0) {
      console.log('No locations to migrate.');
      return;
    }
    
    // Process locations in batches
    for (let i = 0; i < locations.length; i += CONFIG.batchSize) {
      const batch = locations.slice(i, i + CONFIG.batchSize);
      
      console.log(`Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(locations.length / CONFIG.batchSize)}`);
      
      // Process each location in the batch in parallel
      const batchPromises = batch.map(location => processLocation(db, location));
      
      // Wait for all locations in this batch to be processed
      const results = await Promise.all(batchPromises);
      
      // Update processed count
      stats.processedLocations += results.filter(Boolean).length;
      
      // Add a delay between batches to avoid rate limits
      if (i + CONFIG.batchSize < locations.length) {
        console.log(`Waiting ${CONFIG.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
      }
    }
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Print final stats
    console.log('\n========== MIGRATION COMPLETE ==========');
    console.log(`Total locations: ${stats.totalLocations}`);
    console.log(`Successfully processed: ${stats.processedLocations}`);
    console.log(`Skipped locations: ${stats.skippedLocations}`);
    console.log(`Failed locations: ${stats.failedLocations}`);
    console.log(`Total photos: ${stats.totalPhotos}`);
    console.log(`Successfully stored photos: ${stats.storedPhotos}`);
    console.log(`Time taken: ${duration} seconds`);
    console.log('=========================================');
    
    // Update migration status in Firestore
    try {
      const statusRef = db.collection('system').doc('migration_status');
      await statusRef.set({
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        stats: stats,
        duration_seconds: Number(duration)
      });
      console.log('Migration status saved to Firestore');
    } catch (error) {
      console.error('Error saving migration status:', error);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Check if this script is being run directly (not imported)
if (require.main === module) {
  // Run the migration
  migratePhotosToStorage()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
} else {
  // Export the function for use in other scripts
  module.exports = { migratePhotosToStorage };
}