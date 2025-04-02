// functions/blog-posts.js
const { getFirestore } = require('./firebase-admin');

/**
 * Blog Posts API Handler
 * Handles CRUD operations for blog posts
 */
exports.handler = async (event, context) => {
  console.log('Blog posts function called with method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Query params:', event.queryStringParameters);
  // Set headers for CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Get admin token from query params or Authorization header
    const queryToken = event.queryStringParameters?.adminToken;
    const authHeader = event.headers?.authorization;
    const headerToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    const adminToken = queryToken || headerToken;

    // Verify admin token
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Admin privileges required' })
      };
    }

    // Connect to Firestore
    const db = getFirestore();
    const blogsCollection = db.collection('blog-posts');

    // GET: Retrieve all blog posts
    if (event.httpMethod === 'GET' && !event.path.includes('/blog-posts/')) {
      try {
        // Get all blog posts ordered by publish date
        const snapshot = await blogsCollection
          .orderBy('publishDate', 'desc')
          .get();
        
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ posts })
        };
      } catch (error) {
        console.error('Error fetching blog posts:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error fetching blog posts: ' + error.message })
        };
      }
    }

    // GET: Retrieve a single blog post by ID
    if (event.httpMethod === 'GET' && event.path.includes('/blog-posts/')) {
      const id = event.path.split('/').pop();
      const doc = await blogsCollection.doc(id).get();

      if (!doc.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog post not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ post: { id: doc.id, ...doc.data() } })
      };
    }

    // POST: Create a new blog post
    if (event.httpMethod === 'POST') {
      const blogData = JSON.parse(event.body);
      
      // Validate required fields
      if (!blogData.title || !blogData.slug || !blogData.content) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Title, slug, and content are required' })
        };
      }
      
      // Check if a post with the same slug already exists
      const slugCheck = await blogsCollection
        .where('slug', '==', blogData.slug)
        .get();
      
      if (!slugCheck.empty) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'A post with this slug already exists' })
        };
      }
      
      // Add timestamps
      const now = new Date().toISOString();
      blogData.created_at = now;
      blogData.updated_at = now;
      
      // Create the post
      const newPost = await blogsCollection.add(blogData);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Blog post created successfully',
          id: newPost.id
        })
      };
    }

    // PUT: Update an existing blog post
    if (event.httpMethod === 'PUT') {
      const id = event.path.split('/').pop();
      const blogData = JSON.parse(event.body);
      
      // Check if the post exists
      const postDoc = await blogsCollection.doc(id).get();
      if (!postDoc.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog post not found' })
        };
      }
      
      // If slug is changed, verify it's unique
      if (blogData.slug && blogData.slug !== postDoc.data().slug) {
        const slugCheck = await blogsCollection
          .where('slug', '==', blogData.slug)
          .get();
        
        if (!slugCheck.empty && slugCheck.docs[0].id !== id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'A post with this slug already exists' })
          };
        }
      }
      
      // Add timestamp
      blogData.updated_at = new Date().toISOString();
      
      // Update the post
      await blogsCollection.doc(id).update(blogData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Blog post updated successfully'
        })
      };
    }

    // DELETE: Delete a blog post
    if (event.httpMethod === 'DELETE') {
      const id = event.path.split('/').pop();
      
      // Check if the post exists
      const postDoc = await blogsCollection.doc(id).get();
      if (!postDoc.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog post not found' })
        };
      }
      
      // Delete the post
      await blogsCollection.doc(id).delete();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Blog post deleted successfully'
        })
      };
    }

    // Unsupported method
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };

  } catch (error) {
    console.error('Error handling blog posts function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};