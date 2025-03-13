// src/utils/description-generator.ts

/**
 * Generates an AI description for a place using the Anthropic API
 * @param placeData - The Google Place data
 * @returns Promise with the generated description
 */
export async function generatePlaceDescription(placeData: any): Promise<string> {
  try {
    console.log('Generating description for:', placeData.name);
    
    // Call the Netlify function
    const response = await fetch('/api/generate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ place: placeData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.description) {
      return data.description;
    } else {
      throw new Error('No description returned from API');
    }
  } catch (error) {
    console.error('Error generating description:', error);
    
    // Return a default description if the API call fails
    return `${placeData.name} is a great place for kids in Athens. Suitable for various age groups.`;
  }
}