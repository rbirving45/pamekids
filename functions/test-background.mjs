export default async (req, context) => {
    console.log('Background function started');
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Is background invocation:', req.headers.get('netlify-invocation-source') === 'background');
    
    let body;
    try {
      body = await req.json();
      console.log('Request body (JSON):', body);
    } catch (e) {
      console.log('Error parsing body as JSON:', e.message);
      if (context.body) {
        console.log('Context body:', context.body);
      }
    }
    
    if (context.waitUntil) {
      console.log('waitUntil is available');
      context.waitUntil(
        new Promise(resolve => {
          setTimeout(() => {
            console.log('Background processing completed after 5 seconds');
            resolve();
          }, 5000);
        })
      );
    } else {
      console.log('waitUntil is NOT available');
    }
    
    return new Response(JSON.stringify({ message: 'Test completed!' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  };