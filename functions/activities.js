const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Helper to ensure file exists
function ensureFileExists(filePath) {
  const dir = path.dirname(filePath);
  
  try {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      console.log(`Creating file: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify([]));
    }
  } catch (error) {
    console.error(`Error ensuring file exists: ${filePath}`, error);
    // Try an alternative path in the current directory
    const altPath = path.join(__dirname, '../data', path.basename(filePath));
    const altDir = path.dirname(altPath);
    
    console.log(`Trying alternative path: ${altPath}`);
    if (!fs.existsSync(altDir)) {
      fs.mkdirSync(altDir, { recursive: true });
    }
    
    if (!fs.existsSync(altPath)) {
      fs.writeFileSync(altPath, JSON.stringify([]));
    }
    
    // Return the alternative path to be used
    return altPath;
  }
  
  return filePath;
}

// Path to JSON file (relative to function)
const DATA_PATH = path.join(__dirname, 'data/activity-suggestions.json');

exports.handler = async (event, context) => {
  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    return handleSubmission(event);
  } else if (event.httpMethod === 'GET') {
    // Check if this is an admin request with password
    const params = new URLSearchParams(event.queryStringParameters);
    if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
      return handleGetAllSubmissions();
    }
    
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

// Handle new activity submission
async function handleSubmission(event) {
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.name || !data.type || !data.googleMapsLink) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name, type, and Google Maps link are required' })
      };
    }
    
    // Ensure the data file exists
    ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    let suggestions = [];
    try {
      suggestions = JSON.parse(fileContent);
    } catch (e) {
      // If file is empty or invalid, start with empty array
      suggestions = [];
    }
    
    // Add new suggestion
    const newSuggestion = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      googleMapsLink: data.googleMapsLink,
      description: data.description || '',
      email: data.email || '',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    suggestions.push(newSuggestion);
    
    // Write back to file
    fs.writeFileSync(DATA_PATH, JSON.stringify(suggestions, null, 2));
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Activity suggestion submitted successfully'
      })
    };
  } catch (error) {
    console.error('Error processing activity suggestion:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process suggestion' })
    };
  }
}

// Get all submissions (admin only)
async function handleGetAllSubmissions() {
  try {
    // Ensure the data file exists
    ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    let suggestions = [];
    try {
      suggestions = JSON.parse(fileContent);
    } catch (e) {
      suggestions = [];
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        suggestions
      })
    };
  } catch (error) {
    console.error('Error fetching activity suggestions:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch suggestions' })
    };
  }
}