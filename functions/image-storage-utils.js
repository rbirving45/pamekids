/**
 * Image Storage Utilities
 * Functions to download, process, and store images from Google Places API to Firebase Storage
 */

const fetch = require('node-fetch');
const { getStorage } = require('./firebase-admin');
const stream = require('stream');
const { promisify } = require('util');

// Convert stream to buffer for processing images
const streamToBuffer = async (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (chunk) => chunks.push(chunk));
    readableStream.on('error', reject);
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * Download an image from a URL
 * @param {string} url - The URL of the image to download
 * @returns {Promise<Buffer>} - The image data as a buffer
 */
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Get content type for validation
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
    
    // Convert the response to a buffer
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Upload an image to Firebase Storage
 * @param {Buffer} imageBuffer - The image data as a buffer
 * @param {string} locationId - The location ID (used for folder structure)
 * @param {number} index - The index of the image (for filename)
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
async function uploadImageToStorage(imageBuffer, locationId, index) {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    
    // Create a unique filename
    const filename = `location_photos/${locationId}/${index}.jpg`;
    const file = bucket.file(filename);
    
    // Create a write stream and upload the image
    const bufferStream = new stream.PassThrough();
    bufferStream.end(imageBuffer);
    
    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000' // Cache for 1 year
          },
          public: true // Make the file publicly accessible
        }))
        .on('error', reject)
        .on('finish', resolve);
    });
    
    // Make the file publicly accessible and get the URL
    await file.makePublic();
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    
    console.log(`Successfully uploaded image to: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to Storage:', error);
    throw error;
  }
}

/**
 * Process multiple Google Places photos and upload to Firebase Storage
 * @param {string} locationId - The location ID
 * @param {Array<string>} photoUrls - Array of Google Places photo URLs
 * @returns {Promise<Array<string>>} - Array of Firebase Storage URLs
 */
async function processAndStoreLocationPhotos(locationId, photoUrls) {
  try {
    if (!locationId || !photoUrls || photoUrls.length === 0) {
      console.log('No photos to process for location:', locationId);
      return [];
    }
    
    console.log(`Processing ${photoUrls.length} photos for location ${locationId}`);
    
    // Process photos in sequence to avoid overloading the server
    const storedUrls = [];
    
    for (let i = 0; i < photoUrls.length; i++) {
      try {
        // Download the image
        const imageBuffer = await downloadImage(photoUrls[i]);
        
        // Upload to Firebase Storage
        const storedUrl = await uploadImageToStorage(imageBuffer, locationId, i);
        
        // Add to the result array
        storedUrls.push(storedUrl);
        
        console.log(`Processed photo ${i+1}/${photoUrls.length} for location ${locationId}`);
      } catch (error) {
        console.error(`Error processing photo ${i+1} for location ${locationId}:`, error);
        // Continue with other photos even if one fails
      }
      
      // Add a small delay between photos to avoid rate limits
      if (i < photoUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Successfully processed ${storedUrls.length}/${photoUrls.length} photos for location ${locationId}`);
    return storedUrls;
  } catch (error) {
    console.error(`Error processing photos for location ${locationId}:`, error);
    return [];
  }
}

module.exports = {
  downloadImage,
  uploadImageToStorage,
  processAndStoreLocationPhotos
};