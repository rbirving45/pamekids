// fetch-place.js with consistent quote handling and default pricing
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Ensure API keys are available
if (!GOOGLE_API_KEY) {
  console.error('REACT_APP_GOOGLE_MAPS_API_KEY environment variable is missing. Please check your .env file.');
}

if (!ANTHROPIC_API_KEY && process.env.NODE_ENV === 'development') {
  console.warn('ANTHROPIC_API_KEY environment variable is missing. Some features may not work correctly.');
}
const PLACE_ID = process.argv[2] || 'ChIJ-SZuer-foRQR_xVHROWWreM'; // Accept place ID as command line argument
const OUTPUT_FILE = 'locations.ts'; // This will look in the current directory
const BACKUP_FILE = 'locations.ts.original';

// Helper function to safely escape strings for JavaScript
// Use double quotes consistently for all string values
function escapeJSString(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

// Fetch more detailed place data including reviews
const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + PLACE_ID + '&fields=name,formatted_address,formatted_phone_number,website,geometry,opening_hours,rating,user_ratings_total,review,types,price_level,photos&key=' + GOOGLE_API_KEY;

// First, create a backup of the original file
try {
  const currentContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
  fs.writeFileSync(BACKUP_FILE, currentContent);
  console.log(`Created backup of current file at ${BACKUP_FILE}`);
} catch (error) {
  console.error('Error creating backup:', error);
}

// Function to call Claude API using native https
async function callClaudeAPI(prompt) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'anthropic-version': '2023-06-01',
        'x-api-key': ANTHROPIC_API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('Claude API Status Code:', res.statusCode);
          
          if (res.statusCode >= 400) {
            console.error('Claude API Error:', responseData);
            reject(new Error('Claude API returned status code ' + res.statusCode));
            return;
          }
          
          const response = JSON.parse(responseData);
          if (response.content && response.content.length > 0) {
            resolve(response.content[0].text);
          } else {
            console.error('Unexpected Claude API response:', responseData);
            reject(new Error('No content in Claude response'));
          }
        } catch (error) {
          console.error('Error parsing Claude API response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request to Claude API:', error);
      reject(error);
    });
    
    // Send the request
    req.write(requestData);
    req.end();
  });
}

// Function to generate AI summary from place data
async function generateAISummary(place) {
  try {
    // Extract the most relevant information for the prompt
    const placeName = place.name || 'Unknown venue';
    const rating = place.rating || 'No rating available';
    const types = place.types ? place.types.join(', ') : 'No type information';
    
    // Format reviews for better context
    let reviewsText = 'No reviews available.';
    if (place.reviews && place.reviews.length > 0) {
      reviewsText = place.reviews.map(review => 
        '- Rating: ' + review.rating + '/5, Comment: "' + review.text + '"'
      ).join('\n');
    }

    // Craft the prompt for Claude
    const prompt = 'You are helping create concise, helpful descriptions for a map app showing children\'s activities in Athens, Greece. \n' +
    '\nBased on the following information about a location, write a short, informative summary (50 words max) that would help parents decide if this place is suitable for their children. Focus on age-appropriateness, main activities, facilities, and any particular benefits or considerations for families with kids.\n' +
    '\nLocation Information:\n' +
    'Name: ' + placeName + '\n' +
    'Types: ' + types + '\n' +
    'Rating: ' + rating + ' out of 5\n' +
    'Price Level: ' + (place.price_level || 'Not specified') + ' \n' +
    '\nCustomer Reviews:\n' +
    reviewsText + '\n' +
    '\nCRITICAL FORMATTING REQUIREMENTS:\n' +
    '1. Write EXACTLY ONE paragraph with no line breaks\n' +
    '2. Keep your description no longer than 50 words\n' +
    '3. Use a friendly, informative tone\n' +
    '4. Do NOT mention that it was AI-generated\n' +
    '5. Do NOT include quotes, apostrophes, or special characters that would need escaping in JavaScript\n' +
    '6. Do NOT use any dollar signs or characters that could be mistaken for price indicators\n' +
    '7. Do NOT include any information about prices or pricing tiers\n' +
    '\nYour summary should be written in a friendly, informative tone and should NOT mention that it was AI-generated.\n' +
    '\nIMPORTANT: Format your response as a single paragraph without line breaks or special formatting. This will be inserted directly into a JavaScript string.';
    
    // Call Claude API
    const summary = await callClaudeAPI(prompt);
    
    // Process the summary to make it safe for code insertion
    const processedSummary = summary.trim().replace(/(\r\n|\n|\r)/gm, " ");
    
    return processedSummary;

  } catch (error) {
    console.error('Error generating AI summary:', error);
    return "Kid's entertainment and activities in Athens. Suitable for various age groups.";
  }
}

function getActivityType(types) {
  // Map Google place types to your ActivityType categories
  if (!types || !Array.isArray(types)) return 'entertainment';
  
  const typeMap = {
    'amusement_park': 'entertainment',
    'aquarium': 'education',
    'art_gallery': 'arts',
    'museum': 'education',
    'zoo': 'outdoor-play',
    'park': 'outdoor-play',
    'playground': 'outdoor-play',
    'stadium': 'sports',
    'library': 'education',
    'school': 'education',
    'gym': 'sports'
  };
  
  // Find the first matching type
  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }
  
  // Default to entertainment if no match
  return 'entertainment';
}

function formatPlaceData(place, placeId, aiSummary) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Build opening hours string
  let openingHoursLines = [];
  
  for (const day of daysOfWeek) {
    let hoursText = 'Hours not available';
    
    if (place.opening_hours && place.opening_hours.weekday_text) {
      const dayHours = place.opening_hours.weekday_text[daysOfWeek.indexOf(day)];
      if (dayHours) {
        const hoursPart = dayHours.split(': ')[1];
        if (hoursPart) {
          hoursText = hoursPart;
        }
      }
    }
    
    // Escape any special characters in the hours text and use double quotes consistently
    const escapedHours = escapeJSString(hoursText);
    openingHoursLines.push(`      ${day}: "${escapedHours}"`);
  }
  
  const openingHoursStr = openingHoursLines.join(',\n');
  
  // Determine the activity type
  const primaryType = getActivityType(place.types);
  
  // Default age range
  const minAge = primaryType === 'education' ? 3 : 0;
  const maxAge = 16;

  // Format price level - use '$' as default value instead of "undefined"
  let priceRangeStr = '"$"';
  if (place.price_level === 0) {
    priceRangeStr = '"Free entrance"';
  } else if (place.price_level) {
    const priceRange = '$'.repeat(place.price_level);
    priceRangeStr = `"${priceRange}"`;
  }

  // Clean the description for JavaScript string - use double quotes consistently
  const cleanDescription = aiSummary
    .trim()
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, '\\"')
    .replace(/\\/g, '\\\\');

  // Build the complete place data object - use double quotes consistently for all string values
  return `  {
    id: "${placeId}",
    name: "${escapeJSString(place.name)}",
    coordinates: {
      lat: ${place.geometry.location.lat},
      lng: ${place.geometry.location.lng}
    },
    ${place.rating ? `placeData: {
      rating: ${place.rating},
      userRatingsTotal: ${place.user_ratings_total || 'undefined'}
    },` : ''}
    address: "${escapeJSString(place.formatted_address)}",
    types: ["${primaryType}"],
    primaryType: "${primaryType}",
    ageRange: {
      min: ${minAge},
      max: ${maxAge}
    },
    description: "${cleanDescription}",
    openingHours: {
${openingHoursStr}
    },
    priceRange: ${priceRangeStr},
    contact: {
      phone: "${escapeJSString(place.formatted_phone_number || '')}",
      email: "${escapeJSString(place.name ? 'contact@' + place.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com' : 'contact@example.com')}",
      website: "${escapeJSString(place.website || 'https://example.com')}"
    }
  }`;
}

/**
 * IMPROVED FUNCTION: Updates the description of an existing location
 * Now consistently handles double quotes for description fields
 */
function updateLocationDescription(fileContent, placeId, newDescription) {
  // Clean the description for JavaScript string - use double quotes consistently
  const cleanDescription = newDescription
    .trim()
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, '\\"')
    .replace(/\\/g, '\\\\');
  
  // Find the location object with the given ID (using double quotes)
  const locationStart = fileContent.indexOf(`id: "${placeId}"`);
  if (locationStart === -1) {
    // Try with single quotes if not found with double quotes
    const altLocationStart = fileContent.indexOf(`id: '${placeId}'`);
    if (altLocationStart === -1) {
      console.error(`Could not find location with ID ${placeId}`);
      return fileContent;
    }
  }
  
  // Look for the object that contains this place ID
  const idIndex = fileContent.indexOf(`id: "${placeId}"`) !== -1 
    ? fileContent.indexOf(`id: "${placeId}"`) 
    : fileContent.indexOf(`id: '${placeId}'`);
  
  if (idIndex === -1) {
    console.error(`Could not find location with ID ${placeId}`);
    return fileContent;
  }
  
  // Find the start of the object containing this ID
  const objectStartSearch = fileContent.substring(0, idIndex);
  const objectStart = objectStartSearch.lastIndexOf('{');
  
  if (objectStart === -1) {
    console.error('Could not find location object start');
    return fileContent;
  }
  
  // Find the end of the object
  let braceCount = 1; // We've found one opening brace
  let objectEndIndex = objectStart + 1;
  
  while (braceCount > 0 && objectEndIndex < fileContent.length) {
    if (fileContent[objectEndIndex] === '{') braceCount++;
    if (fileContent[objectEndIndex] === '}') braceCount--;
    objectEndIndex++;
  }
  
  if (braceCount !== 0) {
    console.error('Could not find matching closing brace');
    return fileContent;
  }
  
  // Extract the entire object
  const objectContent = fileContent.substring(objectStart, objectEndIndex);
  
  // First try to match description with double quotes
  let descriptionPattern = /description:\s*"(.+?)"/;
  let descriptionMatch = objectContent.match(descriptionPattern);
  
  // If not found, try with single quotes
  if (!descriptionMatch) {
    descriptionPattern = /description:\s*'(.+?)'/;
    descriptionMatch = objectContent.match(descriptionPattern);
    
    if (!descriptionMatch) {
      console.error('Could not find description field');
      return fileContent;
    }
  }
  
  // Get the full match including the quotes and "description: " part
  const fullMatchStr = descriptionMatch[0];
  
  // Replace with new description using double quotes
  const updatedObjectContent = objectContent.replace(
    fullMatchStr,
    `description: "${cleanDescription}"`
  );
  
  // Replace the old object with the updated one
  return fileContent.substring(0, objectStart) + 
         updatedObjectContent + 
         fileContent.substring(objectEndIndex);
}

/**
 * FIXED: Improved function to add a new location
 * This approach will simply find the closing bracket of the array and insert the new location there
 * It will NOT touch any existing content
 */
function addNewLocation(fileContent, newLocationObject) {
  // Find the exact position where the array ends
  const arrayEndPos = fileContent.lastIndexOf('];');
  if (arrayEndPos === -1) {
    console.error('Could not find the end of locations array');
    return fileContent;
  }
  
  // Check if there are already entries by looking for objects in the array
  const arrayStartPos = fileContent.indexOf('export const sampleLocations: Location[] = [');
  if (arrayStartPos === -1) {
    console.error('Could not find the start of locations array');
    return fileContent;
  }
  
  const arrayContent = fileContent.substring(arrayStartPos, arrayEndPos);
  const hasExistingLocations = arrayContent.includes('{') && arrayContent.includes('}');
  
  // Prepare the insertion string (with or without comma)
  let insertionStr;
  if (hasExistingLocations) {
    // Add comma if there are existing locations
    insertionStr = ',\n' + newLocationObject + '\n';
  } else {
    // No comma needed for first location
    insertionStr = '\n' + newLocationObject + '\n';
  }
  
  // Insert at the precise position
  return fileContent.substring(0, arrayEndPos) + insertionStr + fileContent.substring(arrayEndPos);
}

/**
 * Main function to update the locations file
 * This function is extremely conservative and will only:
 * 1. Update the description of an existing location, or
 * 2. Add a new location at the end of the array
 * It will NEVER modify any other content
 */
function updateLocationsFile(fileContent, placeId, newLocationObject, newDescription) {
  // Create a backup of the original file
  fs.writeFileSync(OUTPUT_FILE + '.bak', fileContent);
  
  // Check if the place already exists in the file
  const placeExists = fileContent.includes(`id: "${placeId}"`) || fileContent.includes(`id: '${placeId}'`);
  
  if (placeExists) {
    console.log(`Updating the description for place ${placeId}`);
    // Only update the description field
    return updateLocationDescription(fileContent, placeId, newDescription);
  } else {
    console.log(`Adding new location with ID ${placeId} WITHOUT touching existing data`);
    // Add a new location at the end of the array
    return addNewLocation(fileContent, newLocationObject);
  }
}

// Keep track of which template style to use for new files
function getTemplateIfNeeded() {
  return `// src/data/locations.ts

export type ActivityType = 'indoor-play' | 'outdoor-play' | 'sports' | 'arts' | 'music' | 'education' | 'entertainment';

export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeData?: {
    rating?: number;
    userRatingsTotal?: number;
    photos?: google.maps.places.PlacePhoto[];
    photoUrls?: string[];
  };
  address: string;
  types: ActivityType[]; // Changed from 'type' to 'types' array
  primaryType?: ActivityType; // Optional primary type for backward compatibility
  ageRange: {
    min: number;
    max: number;
  };
  description: string;
  openingHours: {
    [key: string]: string;
  };
  priceRange: string;
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
}

export const sampleLocations: Location[] = [
];`;
}

// Main execution
https.get(url, (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', async () => {
    console.log('Received API response. Processing data...');
    try {
      const place = JSON.parse(data);
      if (place.result) {
        console.log('Successfully fetched data for ' + place.result.name);
        
        // Generate AI summary
        const aiSummary = await generateAISummary(place.result);
        console.log('AI Summary generated:', aiSummary.substring(0, 50) + '...');
        
        // Fallback to a simple description if AI fails
        const validSummary = aiSummary && aiSummary.trim().length > 20
          ? aiSummary
          : `${place.result.name} offers activities for children in Athens.`;
        
        let existingContent = '';
        try {
          existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
          console.log(`Successfully read ${OUTPUT_FILE}, file size: ${existingContent.length} bytes`);
        } catch (error) {
          console.error('Error reading file:', error);
          console.log('Creating a new template file instead');
          existingContent = getTemplateIfNeeded();
        }
        
        // Format the place data
        let formattedPlace = formatPlaceData(place.result, PLACE_ID, validSummary);
        
        // Update the file
        let updatedContent = updateLocationDescription(
          existingContent, 
          PLACE_ID, 
          validSummary
        );
        
        // Check if the update worked by comparing length
        if (updatedContent.length === existingContent.length) {
          console.log('Warning: No changes detected after update. The location might not exist or the description format is unexpected.');
          console.log('Trying to add as a new location...');
          
          updatedContent = addNewLocation(
            existingContent,
            formattedPlace
          );
        }
        
        // Write the updated content to the file
        try {
          fs.writeFileSync(OUTPUT_FILE, updatedContent);
          console.log(`Successfully updated ${OUTPUT_FILE}, new file size: ${updatedContent.length} bytes`);
          
          // Verify the changes were made
          const newContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
          if (newContent.includes(validSummary.substring(0, 30))) {
            console.log('Verified: New description was successfully added to the file.');
          } else {
            console.error('Warning: Could not verify the description was updated. Check the file manually.');
          }
        } catch (writeError) {
          console.error('Error writing to file:', writeError);
        }
      } else {
        console.log('Error: No result returned from the Places API');
        if (place.status) {
          console.log('Status: ' + place.status);
        }
        if (place.error_message) {
          console.log('Error message: ' + place.error_message);
        }
      }
    } catch (error) {
      console.error('Error processing place data:', error);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});