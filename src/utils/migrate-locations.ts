// src/utils/migrate-locations.ts
import { sampleLocations } from '../data/locations';
import { addLocation } from './firebase-service';

// This function will migrate all locations to Firebase
export const migrateLocationsToFirebase = async () => {
  console.log(`Starting migration of ${sampleLocations.length} locations...`);
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (let i = 0; i < sampleLocations.length; i++) {
    const location = sampleLocations[i];
    try {
      // Keep the original ID from the static data
      await addLocation({
        ...location
      });
      
      results.success++;
      console.log(`Migrated ${i + 1}/${sampleLocations.length}: ${location.name}`);
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Failed to migrate ${location.name}: ${errorMessage}`);
      console.error(`Failed to migrate ${location.name}:`, error);
    }
  }

  console.log('Migration completed.');
  console.log(`Success: ${results.success}, Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach(error => console.log(`- ${error}`));
  }
  
  return results;
};