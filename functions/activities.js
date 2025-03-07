const { getFirestore } = require('./firebase-admin');

exports.handler = async (event, context) => {
  console.log('Activities function invoked with method:', event.httpMethod);
  
  try {
    // Handle different HTTP methods
    if (event.httpMethod === 'POST') {
      return await handleSubmission(event);
    } else if (event.httpMethod === 'GET') {
      // Check if this is an admin request with token
      const params = new URLSearchParams(event.queryStringParameters || {});
      if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
        return await handleGetAllSubmissions();
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
    console.error('Error in activities function:', error);
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
    
    const db = getFirestore();
    const activitiesRef = db.collection('activity-suggestions');
    
    // Add new suggestion
    const newSuggestion = {
      name: data.name,
      type: data.type,
      googleMapsLink: data.googleMapsLink,
      description: data.description || '',
      email: data.email || '',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    const docRef = await activitiesRef.add(newSuggestion);
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Activity suggestion submitted successfully',
        id: docRef.id
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
    const db = getFirestore();
    const activitiesRef = db.collection('activity-suggestions');
    
    const snapshot = await activitiesRef.get();
    const suggestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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