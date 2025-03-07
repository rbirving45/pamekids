// Simple admin authentication function

exports.handler = async (event, context) => {
  // Only allow POST requests for login
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Check if password matches environment variable
    if (!data.password || data.password !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: 'Invalid password'
        })
      };
    }
    
    // Return success with admin token (from environment variable)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token: process.env.ADMIN_TOKEN,
        message: 'Login successful'
      })
    };
  } catch (error) {
    console.error('Error in admin login:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process login' })
    };
  }
};