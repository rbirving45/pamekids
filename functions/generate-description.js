// functions/generate-description.js
// This function calls the Anthropic API to generate descriptions for locations

const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
    // Log reviews for debugging
    console.log(`[ServerlessFunction] Place ${place.name} has ${place.reviews ? place.reviews.length : 0} reviews`);
    if (place.reviews && place.reviews.length > 0) {
      console.log(`[ServerlessFunction] First review: ${place.reviews[0].text.substring(0, 100)}...`);
    }
    
    // Extract the most relevant information for the prompt
    const placeName = place.name || 'Unknown venue';
    const rating = place.rating || 'No rating available';
    const types = place.types ? place.types.join(', ') : 'No type information';
    
    // Format reviews for better context (if available)
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
    'Price Level: ' + (place.priceLevel || 'Not specified') + ' \n' +
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
    return place.name + " offers activities for children in Athens. Suitable for various age groups.";
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

  try {
    // API key check
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY environment variable is missing');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key configuration missing' })
      };
    }

    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Validate input
    if (!data.place || !data.place.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid place data. Name is required.' })
      };
    }

    // Generate the AI summary
    const summary = await generateAISummary(data.place);
    
    // Return the generated summary
    return {
      statusCode: 200,
      body: JSON.stringify({ description: summary })
    };
  } catch (error) {
    console.error('Error in generate-description function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate description', details: error.message })
    };
  }
};