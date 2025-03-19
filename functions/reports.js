const { getFirestore } = require('./firebase-admin');

exports.handler = async (event, context) => {
  console.log('Reports function invoked with method:', event.httpMethod);
  
  try {
    // Handle different HTTP methods
    if (event.httpMethod === 'POST') {
      return await handleSubmission(event);
    } else if (event.httpMethod === 'GET') {
      // Check if this is an admin request with token
      const params = new URLSearchParams(event.queryStringParameters || {});
      if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
        return await handleGetAllReports();
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
  } catch (error) {
    console.error('Error in reports function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
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
    
    const db = getFirestore();
    const reportsRef = db.collection('location-reports');
    
    // Add new report
    const newReport = {
      locationId: data.locationId,
      locationName: data.locationName,
      issueType: data.issueType,
      description: data.description,
      email: data.email || '',
      timestamp: new Date().toISOString(),
      status: 'new'
    };
    
    const docRef = await reportsRef.add(newReport);
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Issue report submitted successfully',
        id: docRef.id
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
    console.log('Getting all issue reports (admin request)');
    
    // Initialize Firestore with improved error handling
    let db;
    try {
      db = getFirestore();
      console.log('Firestore initialized successfully for issue reports');
    } catch (dbError) {
      console.error('Failed to initialize Firestore for reports:', dbError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to initialize database connection',
          message: dbError.message,
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        })
      };
    }
    
    const reportsRef = db.collection('location-reports');
    
    try {
      console.log('Fetching issue reports from collection');
      const snapshot = await reportsRef.get();
      console.log(`Found ${snapshot.size} issue reports`);
      
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          reports,
          count: reports.length
        })
      };
    } catch (queryError) {
      console.error('Error querying issue reports:', queryError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to fetch reports',
          message: queryError.message,
          stack: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
        })
      };
    }
  } catch (error) {
    console.error('Uncaught error in handleGetAllReports:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch reports',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}