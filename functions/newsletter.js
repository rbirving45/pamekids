// functions/newsletter.js
const { getFirestore } = require('./firebase-admin');

exports.handler = async (event, context) => {
  console.log('Newsletter function invoked with method:', event.httpMethod);
  
  try {
    // Handle different HTTP methods
    if (event.httpMethod === 'POST') {
      return await handleSubscription(event);
    } else if (event.httpMethod === 'GET') {
      // Check if this is an admin request with token
      const params = new URLSearchParams(event.queryStringParameters || {});
      if (params.get('adminToken') === process.env.ADMIN_TOKEN) {
        return await handleGetAllSubscriptions();
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
    console.error('Error in newsletter function:', error);
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
    
    // Initialize Firestore with error handling
    const db = getFirestore();
    const subscribersRef = db.collection('newsletter-subscribers');
    
    // Check for duplicate email
    const snapshot = await subscribersRef.where('email', '==', data.email).get();
    if (!snapshot.empty) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email already subscribed' })
      };
    }
    
    // Add new subscriber
    const newSubscriber = {
      email: data.email,
      firstName: data.firstName || '',
      ageRanges: data.ageRanges,
      postalCode: data.postalCode || '',
      subscribedAt: new Date().toISOString()
    };
    
    const docRef = await subscribersRef.add(newSubscriber);
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Successfully subscribed to newsletter',
        id: docRef.id
      })
    };
  } catch (error) {
    console.error('Error processing subscription:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process subscription',
        message: error.message
      })
    };
  }
}

// Get all subscribers (admin only)
async function handleGetAllSubscriptions() {
  try {
    const db = getFirestore();
    const subscribersRef = db.collection('newsletter-subscribers');
    
    const snapshot = await subscribersRef.get();
    const subscribers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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
      body: JSON.stringify({ 
        error: 'Failed to fetch subscribers',
        message: error.message
      })
    };
  }
}