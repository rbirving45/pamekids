const fs = require('fs');
const path = require('path');
const setupModule = require('./setup');

// Get file paths from the setup module
let DATA_PATH;

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
    
    // Use the setup module to find a writable path
    const paths = setupModule.getPaths();
    const altPath = paths.SUBSCRIBERS_FILE;
    
    console.log(`Using alternative path from setup module: ${altPath}`);
    return altPath;
  }
  
  return filePath;
}

// Initialize data path
function initializePaths() {
  try {
    const paths = setupModule.getPaths();
    DATA_PATH = paths.SUBSCRIBERS_FILE;
    console.log('Newsletter DATA_PATH initialized:', DATA_PATH);
    return DATA_PATH;
  } catch (error) {
    console.error('Error initializing data paths:', error);
    // Fallback to original path if setup module fails
    const fallbackPath = path.join(__dirname, 'data/newsletter-subscribers.json');
    console.log('Using fallback path:', fallbackPath);
    return fallbackPath;
  }
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Newsletter function invoked with method:', event.httpMethod);
  
  // Initialize DATA_PATH if not already done
  if (!DATA_PATH) {
    DATA_PATH = initializePaths();
  }
  
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
    
    // Run setup to ensure data files exist
    try {
      setupModule.initializeDataFiles();
    } catch (setupError) {
      console.warn('Setup module initialization warning:', setupError);
      // Continue with the function even if setup fails
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
    // Run setup to ensure data files exist
    try {
      setupModule.initializeDataFiles();
    } catch (setupError) {
      console.warn('Setup module initialization warning:', setupError);
      // Continue with the function even if setup fails
    }
    
    // Ensure the data file exists
    const dataFile = ensureFileExists(DATA_PATH);
    console.log('Reading subscribers from:', dataFile);
    
    // Read existing data
    let subscribers = [];
    
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      try {
        subscribers = JSON.parse(fileContent);
      } catch (e) {
        console.error('Error parsing subscribers JSON:', e);
        subscribers = [];
      }
    } else {
      console.warn('Subscribers file does not exist, returning empty array');
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