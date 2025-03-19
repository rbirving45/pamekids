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
    console.log('Getting all newsletter subscribers (admin request)');
    
    // Initialize Firestore with improved error handling
    let db;
    try {
      db = getFirestore();
      console.log('Firestore initialized successfully for newsletter subscribers');
    } catch (dbError) {
      console.error('Failed to initialize Firestore for newsletter:', dbError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to initialize database connection',
          message: dbError.message,
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        })
      };
    }
    
    const subscribersRef = db.collection('newsletter-subscribers');
    
    try {
      console.log('Fetching newsletter subscribers from collection');
      const snapshot = await subscribersRef.get();
      console.log(`Found ${snapshot.size} newsletter subscribers`);
      
      const subscribers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          subscribers,
          count: subscribers.length
        })
      };
    } catch (queryError) {
      console.error('Error querying newsletter subscribers:', queryError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to fetch subscribers',
          message: queryError.message,
          stack: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
        })
      };
    }
  } catch (error) {
    console.error('Uncaught error in handleGetAllSubscriptions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch subscribers',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}