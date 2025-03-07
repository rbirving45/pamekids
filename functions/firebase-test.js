// functions/firebase-test.js
const { getFirestore } = require('./firebase-admin');

exports.handler = async (event, context) => {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to initialize Firestore
    const db = getFirestore();
    
    // Try a simple operation
    const testCollection = db.collection('test');
    const testDoc = await testCollection.doc('test').get();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Firebase connection successful',
        testDoc: testDoc.exists ? 'Document exists' : 'Document does not exist',
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
      })
    };
  } catch (error) {
    console.error('Firebase test error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Firebase connection failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};