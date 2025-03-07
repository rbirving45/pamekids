const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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
    const altPath = paths.REPORTS_FILE;
    
    console.log(`Using alternative path from setup module: ${altPath}`);
    return altPath;
  }
  
  return filePath;
}

// Initialize data path
function initializePaths() {
  try {
    const paths = setupModule.getPaths();
    DATA_PATH = paths.REPORTS_FILE;
    console.log('Reports DATA_PATH initialized:', DATA_PATH);
    return DATA_PATH;
  } catch (error) {
    console.error('Error initializing data paths:', error);
    // Fallback to original path if setup module fails
    const fallbackPath = path.join(__dirname, 'data/location-reports.json');
    console.log('Using fallback path:', fallbackPath);
    return fallbackPath;
  }
}

exports.handler = async (event, context) => {
  console.log('Reports function invoked with method:', event.httpMethod);
  
  // Initialize DATA_PATH if not already done
  if (!DATA_PATH) {
    DATA_PATH = initializePaths();
  }
  
  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    return handleSubmission(event);
  } else if (event.httpMethod === 'GET') {
    // Check if this is an admin request with token
    const params = new URLSearchParams(event.queryStringParameters || {});
    if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
      return handleGetAllReports();
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

// Handle new report submission
async function handleSubmission(event) {
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.locationId || !data.locationName || !data.issueType || !data.description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Location ID, name, issue type, and description are required' })
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
    let reports = [];
    try {
      reports = JSON.parse(fileContent);
    } catch (e) {
      // If file is empty or invalid, start with empty array
      reports = [];
    }
    
    // Add new report
    const newReport = {
      id: uuidv4(),
      locationId: data.locationId,
      locationName: data.locationName,
      issueType: data.issueType,
      description: data.description,
      email: data.email || '',
      timestamp: new Date().toISOString(),
      status: 'new'
    };
    
    reports.push(newReport);
    
    // Write back to file
    fs.writeFileSync(dataFile, JSON.stringify(reports, null, 2));
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Issue report submitted successfully'
      })
    };
  } catch (error) {
    console.error('Error processing issue report:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process report' })
    };
  }
}

// Get all reports (admin only)
async function handleGetAllReports() {
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
    console.log('Reading reports from:', dataFile);
    
    // Read existing data
    let reports = [];
    
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      try {
        reports = JSON.parse(fileContent);
      } catch (e) {
        console.error('Error parsing reports JSON:', e);
        reports = [];
      }
    } else {
      console.warn('Reports file does not exist, returning empty array');
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reports
      })
    };
  } catch (error) {
    console.error('Error fetching issue reports:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch reports' })
    };
  }
}