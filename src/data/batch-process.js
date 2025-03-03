// batch-process.js
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to extract place IDs from the locations.ts file
function extractPlaceIds() {
  try {
    const fileContent = fs.readFileSync('locations.ts', 'utf8');
    const regex = /id: '(.*?)'/g;
    const placeIds = [];
    let match;
    
    while ((match = regex.exec(fileContent)) !== null) {
      placeIds.push(match[1]);
    }
    
    return placeIds;
  } catch (error) {
    console.error('Error reading locations.ts:', error);
    return [];
  }
}

// Process each place ID with a delay to avoid rate limits
async function processPlaceIds(placeIds) {
  console.log(`Found ${placeIds.length} place IDs to process.`);
  
  for (let i = 0; i < placeIds.length; i++) {
    const placeId = placeIds[i];
    console.log(`Processing place ID ${i+1}/${placeIds.length}: ${placeId}`);
    
    try {
      await execPromise(`node fetch-place.js ${placeId}`);
      // Wait 2 seconds between API calls to avoid hitting rate limits
      if (i < placeIds.length - 1) {
        console.log('Waiting 2 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error processing place ID ${placeId}:`, error.message);
    }
  }
  
  console.log('Batch processing complete!');
}

// Main execution
const placeIds = extractPlaceIds();
processPlaceIds(placeIds);