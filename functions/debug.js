const fs = require('fs');
const path = require('path');
const os = require('os');
const setupModule = require('./setup');

exports.handler = async (event, context) => {
  // Only allow with admin token for security
  const params = new URLSearchParams(event.queryStringParameters || {});
  if (params.get('adminToken') !== process.env.ADMIN_TOKEN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Gather information about the environment
    const debug = {
      environment: {
        node_version: process.version,
        platform: process.platform,
        env: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('TOKEN') && !key.includes('PASSWORD')),
        netlify: !!process.env.NETLIFY,
        tmpdir: os.tmpdir(),
        homedir: os.homedir(),
        cwd: process.cwd(),
        memory: process.memoryUsage(),
      },
      paths: {},
      fileSystem: {},
      testResults: {}
    };

    // Get paths from setup module
    try {
      debug.paths.fromSetup = setupModule.getPaths();
    } catch (error) {
      debug.paths.setupError = error.message;
    }

    // Common paths we might want to try
    const potentialPaths = [
      { name: 'function_dir', path: __dirname },
      { name: 'function_data', path: path.join(__dirname, 'data') },
      { name: 'function_parent', path: path.join(__dirname, '..') },
      { name: 'function_parent_data', path: path.join(__dirname, '../data') },
      { name: 'tmp', path: os.tmpdir() },
      { name: 'tmp_app', path: path.join(os.tmpdir(), 'pamekids-data') },
      { name: 'netlify_function', path: path.join(process.cwd()) },
      { name: 'netlify_function_data', path: path.join(process.cwd(), 'data') }
    ];

    // Check existence and permissions of each path
    for (const pathInfo of potentialPaths) {
      try {
        const exists = fs.existsSync(pathInfo.path);
        debug.fileSystem[pathInfo.name] = {
          path: pathInfo.path,
          exists: exists
        };

        if (exists) {
          const stats = fs.statSync(pathInfo.path);
          debug.fileSystem[pathInfo.name].isDirectory = stats.isDirectory();
          debug.fileSystem[pathInfo.name].permissions = stats.mode.toString(8);

          // If it's a directory, list contents
          if (stats.isDirectory()) {
            try {
              debug.fileSystem[pathInfo.name].contents = fs.readdirSync(pathInfo.path);
            } catch (e) {
              debug.fileSystem[pathInfo.name].listError = e.message;
            }
          }
        }

        // Try to write a test file
        try {
          const testFilePath = path.join(pathInfo.path, '.test-write');
          fs.writeFileSync(testFilePath, 'test');
          debug.testResults[pathInfo.name] = 'Write successful';
          
          // Try to read it back
          const readResult = fs.readFileSync(testFilePath, 'utf8');
          debug.testResults[pathInfo.name] += ', Read successful';
          
          // Try to delete it
          fs.unlinkSync(testFilePath);
          debug.testResults[pathInfo.name] += ', Delete successful';
        } catch (e) {
          debug.testResults[pathInfo.name] = `Error: ${e.message}`;
        }
      } catch (error) {
        debug.fileSystem[pathInfo.name] = {
          path: pathInfo.path,
          error: error.message
        };
      }
    }

    // Check API data files
    const dataFiles = [
      { name: 'subscribers', path: debug.paths.fromSetup?.SUBSCRIBERS_FILE || path.join(os.tmpdir(), 'pamekids-data', 'newsletter-subscribers.json') },
      { name: 'activities', path: debug.paths.fromSetup?.ACTIVITIES_FILE || path.join(os.tmpdir(), 'pamekids-data', 'activity-suggestions.json') },
      { name: 'reports', path: debug.paths.fromSetup?.REPORTS_FILE || path.join(os.tmpdir(), 'pamekids-data', 'location-reports.json') }
    ];

    debug.dataFiles = {};
    for (const file of dataFiles) {
      try {
        const exists = fs.existsSync(file.path);
        debug.dataFiles[file.name] = {
          path: file.path,
          exists: exists
        };

        if (exists) {
          const stats = fs.statSync(file.path);
          debug.dataFiles[file.name].size = stats.size;
          debug.dataFiles[file.name].permissions = stats.mode.toString(8);
          
          // Try to read file content
          try {
            const content = fs.readFileSync(file.path, 'utf8');
            let parsedContent;
            try {
              parsedContent = JSON.parse(content);
              debug.dataFiles[file.name].isValidJson = true;
              debug.dataFiles[file.name].itemCount = Array.isArray(parsedContent) ? parsedContent.length : 'Not an array';
            } catch (e) {
              debug.dataFiles[file.name].isValidJson = false;
              debug.dataFiles[file.name].parseError = e.message;
            }
          } catch (e) {
            debug.dataFiles[file.name].readError = e.message;
          }
        }
      } catch (error) {
        debug.dataFiles[file.name] = {
          path: file.path,
          error: error.message
        };
      }
    }

    // Initialize data directories
    try {
      const initResult = setupModule.initializeDataFiles();
      debug.initResult = {
        success: true,
        paths: initResult
      };
    } catch (error) {
      debug.initResult = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(debug, null, 2),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Debug function failed',
        message: error.message,
        stack: error.stack
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};