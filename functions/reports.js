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
const DATA_PATH = path.join(__dirname, 'data/location-reports.json');

exports.handler = async (event, context) => {
  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    return handleSubmission(event);
  } else if (event.httpMethod === 'GET') {
    // Check if this is an admin request with password
    const params = new URLSearchParams(event.queryStringParameters);
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
    
    // Ensure the data file exists
    ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
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
    fs.writeFileSync(DATA_PATH, JSON.stringify(reports, null, 2));
    
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
    // Ensure the data file exists
    ensureFileExists(DATA_PATH);
    
    // Read existing data
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    let reports = [];
    try {
      reports = JSON.parse(fileContent);
    } catch (e) {
      reports = [];
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