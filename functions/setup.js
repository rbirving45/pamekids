const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the best data directory based on environment
const getBestDataDir = () => {
  // For Netlify, use the temp directory (which is writable)
  if (process.env.NETLIFY) {
    const netlifyTempDir = path.join(os.tmpdir(), 'pamekids-data');
    try {
      if (!fs.existsSync(netlifyTempDir)) {
        fs.mkdirSync(netlifyTempDir, { recursive: true });
      }
      return netlifyTempDir;
    } catch (error) {
      console.error('Error creating Netlify temp directory:', error);
    }
  }
  
  // Try the function directory first (works locally)
  const functionDir = path.join(__dirname, 'data');
  try {
    if (!fs.existsSync(functionDir)) {
      fs.mkdirSync(functionDir, { recursive: true });
    }
    
    // Test write access
    const testFile = path.join(functionDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    return functionDir;
  } catch (error) {
    console.warn('Function directory not writable:', error.message);
  }

  // Try temp directory as fallback
  const tempDir = path.join(os.tmpdir(), 'pamekids-data');
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
  
  // Last resort, use parent directory
  return path.join(__dirname, '../data');
};

// Export the data directory and file paths
exports.getPaths = () => {
  const dataDir = getBestDataDir();
  console.log('Using data directory:', dataDir);
  
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
  
  // Initialize files with empty arrays if they don't exist
  const initFile = (filePath, initialContent = []) => {
    if (!fs.existsSync(filePath)) {
      console.log(`Creating file: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify(initialContent, null, 2));
    }
  };
  
  try {
    // Make sure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Initialize each file
    initFile(SUBSCRIBERS_FILE);
    initFile(ACTIVITIES_FILE);
    initFile(REPORTS_FILE);
    
    return {
      success: true,
      DATA_DIR,
      SUBSCRIBERS_FILE,
      ACTIVITIES_FILE,
      REPORTS_FILE
    };
  } catch (error) {
    console.error('Error initializing data files:', error);
    throw error;
  }
};

// Test writing to ensure we can access the file system
exports.testFileSystem = () => {
  const { DATA_DIR } = exports.getPaths();
  const results = { success: false };
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      results.dirCreated = true;
    }
    
    // Test write
    const testFile = path.join(DATA_DIR, '.test-file');
    fs.writeFileSync(testFile, 'test content');
    results.writeSuccess = true;
    
    // Test read
    const content = fs.readFileSync(testFile, 'utf8');
    results.readSuccess = content === 'test content';
    
    // Test delete
    fs.unlinkSync(testFile);
    results.deleteSuccess = !fs.existsSync(testFile);
    
    results.success = results.writeSuccess && results.readSuccess && results.deleteSuccess;
  } catch (error) {
    results.error = error.message;
    results.stack = error.stack;
  }
  
  return results;
};

// Ensure all data directories and files exist
exports.handler = async (event, context) => {
  console.log('Setup function invoked');
  
  try {
    // Test file system access
    const testResults = exports.testFileSystem();
    console.log('File system test results:', testResults);
    
    if (!testResults.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'File system tests failed',
          details: testResults
        })
      };
    }
    
    // Initialize data files
    const initResults = exports.initializeDataFiles();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data directories initialized successfully',
        results: initResults,
        testResults
      })
    };
  } catch (error) {
    console.error('Error in setup handler:', error);
    
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