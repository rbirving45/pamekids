const fs = require('fs');
const path = require('path');

// Helper function to determine the most appropriate data directory
const getDataDir = () => {
  // Primary location: within the function directory (works locally)
  const primaryDir = path.join(__dirname, 'data');
  
  // Secondary location: in /tmp (works in Netlify Functions)
  const secondaryDir = process.env.NETLIFY
    ? path.join('/tmp', 'pamekids-data')
    : path.join(__dirname, '../data');
  
  // Check if primary location is writable
  try {
    // Try to create the primary directory if it doesn't exist
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    
    // Test if we can write to this directory
    const testFile = path.join(primaryDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    console.log('Using primary data directory:', primaryDir);
    return primaryDir;
  } catch (err) {
    console.log('Primary directory not writable, trying secondary location:', secondaryDir);
    
    // Try secondary location
    try {
      if (!fs.existsSync(secondaryDir)) {
        fs.mkdirSync(secondaryDir, { recursive: true });
      }
      
      // Test if we can write to this directory
      const testFile = path.join(secondaryDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      console.log('Using secondary data directory:', secondaryDir);
      return secondaryDir;
    } catch (secondaryErr) {
      console.error('Both primary and secondary directories are not writable:', secondaryErr);
      throw secondaryErr;
    }
  }
};

// Export the data directory and file paths for use in other functions
exports.getPaths = () => {
  const dataDir = getDataDir();
  
  return {
    DATA_DIR: dataDir,
    SUBSCRIBERS_FILE: path.join(dataDir, 'newsletter-subscribers.json'),
    ACTIVITIES_FILE: path.join(dataDir, 'activity-suggestions.json'),
    REPORTS_FILE: path.join(dataDir, 'location-reports.json')
  };
};

// Initialize data files
exports.initializeDataFiles = () => {
  const { DATA_DIR, SUBSCRIBERS_FILE, ACTIVITIES_FILE, REPORTS_FILE } = exports.getPaths();
  
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
  
  return {
    DATA_DIR,
    SUBSCRIBERS_FILE,
    ACTIVITIES_FILE,
    REPORTS_FILE
  };
};

// Ensure all data directories and files exist
exports.handler = async (event, context) => {
  try {
    const paths = exports.initializeDataFiles();
    
    // Verify the files were created
    const files = fs.readdirSync(paths.DATA_DIR);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data directories initialized successfully',
        paths,
        files
      })
    };
  } catch (error) {
    console.error('Error initializing data directories:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initialize data directories',
        message: error.message,
        stack: error.stack
      })
    };
  }
};