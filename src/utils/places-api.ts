// Handles interaction with the Google Places API
// Functions to fetch place details, photos, and other information

/**
 * Fetches place details from Google Maps Places API
 * @param placeId - The Google Maps Place ID
 * @param maps - Google Maps API instance
 * @returns Promise with place data
 */
export async function fetchPlaceDetails(placeId: string, maps: typeof google.maps): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!placeId || !maps) {
      reject(new Error('Missing placeId or maps instance'));
      return;
    }

    try {
      // Create a Places service instance
      const service = new maps.places.PlacesService(document.createElement('div'));
      
      // Request place details
      service.getDetails(
        {
          placeId,
          fields: [
            'name',
            'formatted_address',
            'rating',
            'user_ratings_total',
            'formatted_phone_number',
            'website',
            'opening_hours',
            'photos',
            'geometry'
          ]
        },
        (result, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && result) {
            // Process photos if available
            let photoUrls: string[] = [];
            
            if (result.photos && result.photos.length > 0) {
              // Get up to 5 photo URLs
              photoUrls = result.photos
                .slice(0, 5)
                .map(photo => {
                  try {
                    return photo.getUrl({ maxHeight: 500, maxWidth: 800 });
                  } catch (e) {
                    console.warn('Error fetching photo URL', e);
                    return null;
                  }
                })
                .filter(Boolean) as string[];
            }
            
            // Format opening hours
            let formattedHours: Record<string, string> = {};
            if (result.opening_hours && result.opening_hours.weekday_text) {
              result.opening_hours.weekday_text.forEach(dayText => {
                // Parse "Day: Hours" format
                const matches = dayText.match(/^([^:]+):\s(.+)$/);
                if (matches && matches.length === 3) {
                  const [, day, hours] = matches;
                  formattedHours[day] = hours;
                }
              });
            }
            
            // Create structured place data
            const placeData = {
              name: result.name,
              address: result.formatted_address,
              phone: result.formatted_phone_number,
              website: result.website,
              rating: result.rating,
              userRatingsTotal: result.user_ratings_total,
              hours: formattedHours,
              photos: result.photos || [],
              photoUrls,
              geometry: result.geometry
            };
            
            resolve(placeData);
          } else {
            // Common place errors shouldn't crash the app
            console.warn(`Place details fetch failed: ${status}`);
            reject(new Error(`Failed to fetch place details: ${status}`));
          }
        }
      );
    } catch (error) {
      console.error('Error fetching place details:', error);
      reject(error);
    }
  });
}

/**
 * Helper function to extract Place ID from a Google Maps URL
 * @param url - Google Maps URL
 * @returns Place ID or null if not found
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    // Handle various Google Maps URL formats
    const urlObj = new URL(url);
    
    // Extract from query parameter
    const searchParams = urlObj.searchParams;
    if (searchParams.has('place_id')) {
      return searchParams.get('place_id');
    }
    
    // Extract from path format
    const pathMatch = urlObj.pathname.match(/\/place\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return null;
  }
}

// Exported interface for the API
const placesApi = {
  fetchPlaceDetails,
  extractPlaceIdFromUrl
};

export default placesApi;