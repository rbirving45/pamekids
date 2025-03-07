const fs = require('fs');
const path = require('path');

// Path to various data files
const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'newsletter-subscribers.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activity-suggestions.json');
const REPORTS_FILE = path.join(DATA_DIR, 'location-reports.json');

// Ensure all data directories and files exist
exports.handler = async (event, context) => {
  try {
    // Create data directory
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Creating data directory: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Create files if they don't exist
    if (!fs.existsSync(SUBSCRIBERS_FILE)) {
      console.log(`Creating subscribers file: ${SUBSCRIBERS_FILE}`);
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([]));
    }
    
    if (!fs.existsSync(ACTIVITIES_FILE)) {
      console.log(`Creating activities file: ${ACTIVITIES_FILE}`);
      fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([]));
    }
    
    if (!fs.existsSync(REPORTS_FILE)) {
      console.log(`Creating reports file: ${REPORTS_FILE}`);
      fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
    }
    
    // Verify the files were created
    const files = fs.readdirSync(DATA_DIR);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data directories initialized successfully',
        files
      })
    };
  } catch (error) {
    console.error('Error initializing data directories:', error);
    
    // Try a different approach - create in the current directory
    try {
      const alternativeDir = path.join(__dirname, '../data');
      
      if (!fs.existsSync(alternativeDir)) {
        fs.mkdirSync(alternativeDir, { recursive: true });
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Attempted alternative data directory setup',
          alternativeDir
        })
      };
    } catch (altError) {
      console.error('Alternative approach also failed:', altError);
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to initialize data directories',
          message: error.message,
          stack: error.stack
        })
      };
    }
  }
};