const fs = require('fs');
const path = require('path');

// Path to JSON file (relative to function)
const DATA_PATH = path.join(__dirname, 'data/newsletter-subscribers.json');

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
    const altPath = path.join(__dirname, 'data', path.basename(filePath));
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

// Main handler
exports.handler = async (event, context) => {
  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    return handleSubscription(event);
  } else if (event.httpMethod === 'GET') {
    // Check if this is an admin request with token
    const params = new URLSearchParams(event.queryStringParameters || {});
    if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
      return handleGetAllSubscriptions();
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

// Handle new subscription
async function handleSubscription(event) {
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.email || !data.ageRanges || data.ageRanges.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and age ranges are required' })
      };
    }
    
    // Ensure the data file exists
    const dataFile = ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    let subscribers = [];
    try {
      subscribers = JSON.parse(fileContent);
    } catch (e) {
      // If file is empty or invalid, start with empty array
      subscribers = [];
    }
    
    // Check for duplicate email
    const existingSubscriber = subscribers.find(sub => sub.email === data.email);
    if (existingSubscriber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email already subscribed' })
      };
    }
    
    // Add new subscriber
    const newSubscriber = {
      id: Date.now().toString(),
      email: data.email,
      firstName: data.firstName || '',
      ageRanges: data.ageRanges,
      postalCode: data.postalCode || '',
      subscribedAt: new Date().toISOString()
    };
    
    subscribers.push(newSubscriber);
    
    // Write back to file
    fs.writeFileSync(dataFile, JSON.stringify(subscribers, null, 2));
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Successfully subscribed to newsletter'
      })
    };
  } catch (error) {
    console.error('Error processing subscription:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process subscription' })
    };
  }
}

// Get all subscribers (admin only)
async function handleGetAllSubscriptions() {
  try {
    // Ensure the data file exists
    const dataFile = ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    let subscribers = [];
    try {
      subscribers = JSON.parse(fileContent);
    } catch (e) {
      subscribers = [];
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        subscribers
      })
    };
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch subscribers' })
    };
  }
}