import React, { useState } from 'react';
import { addLocation, getLocations } from '../../utils/firebase-service';
import { fetchPlaceDetails } from '../../utils/places-api';
import { generatePlaceDescription } from '../../utils/description-generator';
import PlaceSearch from './PlaceSearch';
import LocationForm, { LocationFormData } from './LocationForm';
import { ActivityType } from '../../types/location';

// Interface for Google Place photo to fix TS type errors
interface GooglePlacePhoto {
  photo_reference: string;
  height?: number;
  width?: number;
  html_attributions?: string[];
}

const activityTypeMapping: Record<string, ActivityType> = {
  'amusement_park': 'entertainment',
  'aquarium': 'education',
  'art_gallery': 'arts',
  'museum': 'education',
  'zoo': 'outdoor-play',
  'park': 'outdoor-play',
  'playground': 'outdoor-play',
  'stadium': 'sports',
  'library': 'education',
  'school': 'education',
  'gym': 'sports',
  'restaurant': 'entertainment',
  'cafe': 'entertainment'
};

interface AddLocationFormProps {
  onLocationAdded?: () => void;
}

const AddLocationForm: React.FC<AddLocationFormProps> = ({ onLocationAdded }) => {
  const [placeId, setPlaceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
    photoCount?: number;
  } | null>(null);

  const fetchPlace = async (id?: string) => {
    // Use the provided id or fall back to the state value
    const placeIdToFetch = id || placeId;
    
    if (!placeIdToFetch.trim()) {
      setError('Please enter a Google Place ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the Google Maps API instance
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps API not loaded');
      }
      
      // Update the placeId state if using a provided ID
      if (id) {
        setPlaceId(id);
      }
      
      // First check if this place already exists in our database
      let placeData: any = null;
      try {
        // Try to fetch from Firestore first (to prevent duplicates)
        placeData = await fetchPlaceDetails(placeIdToFetch, window.google.maps);
        console.log('Location found in database, loading existing data...');
        
        // If we get here, the location already exists in our database
        setIsLoading(false);
        setError(`This location (${placeData.name || placeIdToFetch}) already exists in the database. To modify it, please use the edit function, or delete it first if you want to recreate it.`);
        return; // Exit early - don't proceed with form creation for existing locations
      } catch (firestoreError: unknown) {
        // If location not found in Firestore, fetch from Google Places API instead
        if (
          firestoreError instanceof Error &&
          firestoreError.message &&
          firestoreError.message.includes('Location not found')
        ) {
          console.log(`Location not found in database, fetching from Google Places API: ${placeIdToFetch}`);
          // Import the new function to fetch from Google Places API
          const { fetchPlaceDetailsFromGoogleApi } = await import('../../utils/places-api');
          placeData = await fetchPlaceDetailsFromGoogleApi(placeIdToFetch, window.google.maps);
        } else {
          // Re-throw other errors
          throw firestoreError;
        }
      }
      
      if (!placeData) {
        throw new Error('Could not fetch place details');
      }

      // Determine the primary activity type
      let primaryType: ActivityType = 'entertainment'; // Default
      
      if (placeData.types && placeData.types.length > 0) {
        for (const type of placeData.types) {
          if (activityTypeMapping[type]) {
            primaryType = activityTypeMapping[type];
            break;
          }
        }
      }
      
      // Handle both function and direct property patterns for coordinates
      const getLocationCoordinates = () => {
        const location = placeData.geometry?.location;
        if (!location) return { lat: 0, lng: 0 };
        
        // First check if location has lat/lng functions (common in Google Maps API)
        if (typeof location.lat === 'function' && typeof location.lng === 'function') {
          return {
            lat: location.lat(),
            lng: location.lng()
          };
        }
        
        // Then check if lat/lng are direct properties
        if (typeof location.lat === 'number' && typeof location.lng === 'number') {
          return {
            lat: location.lat,
            lng: location.lng
          };
        }
        
        // Finally, see if we can access lat/lng from other properties
        if (location.latitude !== undefined && location.longitude !== undefined) {
          return {
            lat: Number(location.latitude),
            lng: Number(location.longitude)
          };
        }
        
        // Fallback to zeros
        console.warn('Could not determine location coordinates, using default zeros');
        return { lat: 0, lng: 0 };
      };

      const coordinates = getLocationCoordinates();
      
      // Process opening hours from Google Places API
      const processOpeningHours = (): Record<string, string> => {
        const openingHours: Record<string, string> = {};
        
        if (placeData.opening_hours && placeData.opening_hours.weekday_text) {
          const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          
          placeData.opening_hours.weekday_text.forEach((text: string) => {
            for (const day of weekdays) {
              if (text.startsWith(day)) {
                openingHours[day] = text.substring(day.length + 2); // +2 to skip ": "
                break;
              }
            }
          });
        }
        
        return openingHours;
      };
      
      // Process and generate photo URLs
      const processPhotos = (): string[] => {
        if (!placeData.photos || !placeData.photos.length) {
          return [];
        }
        
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.warn('Google Maps API key missing, cannot generate photo URLs');
          return [];
        }
        
        // Take up to 10 photos and generate URLs
        return placeData.photos.slice(0, 10).map((photo: GooglePlacePhoto) => {
          const reference = photo.photo_reference;
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${reference}&key=${apiKey}`;
        });
      };
      
      // Create placeData with all available info from Google
      const googlePlaceData = {
        rating: placeData.rating,
        userRatingsTotal: placeData.user_ratings_total,
        photoUrls: processPhotos(),
        phone: placeData.formatted_phone_number,
        website: placeData.website,
        address: placeData.formatted_address,
        hours: processOpeningHours(),
        last_fetched: new Date().toISOString()
      };
      
      // Prepare the initial form data with type-safe handling of placeData
      const initialFormData: LocationFormData = {
        id: placeIdToFetch,
        name: placeData.name,
        coordinates: coordinates,
        types: [primaryType],
        primaryType: primaryType,
        address: placeData.formatted_address || '',
        ageRange: {
          min: primaryType === 'education' ? 3 : 0,
          max: 16
        },
        description: `${placeData.name} is a great place for kids in Athens. Suitable for various age groups.`,
        openingHours: processOpeningHours(),
        priceRange: placeData.price_level ? '€'.repeat(placeData.price_level) : '€',
        contact: {
          phone: placeData.formatted_phone_number || '',
          email: '',
          website: placeData.website || ''
        },
        proTips: '' // Initialize with empty string for proTips
      };
      
      // Add the placeData separately to ensure type safety
      (initialFormData as any).placeData = googlePlaceData;

      // Set form data
      setFormData(initialFormData);
      
      // Try to generate an AI description
      try {
        // Make sure placeData has a name before trying to generate a description
        if (placeData && placeData.name) {
          setGeneratingDescription(true);
          const aiDescription = await generatePlaceDescription(placeData);
          
          // Update the form data with the AI-generated description
          setFormData(prevData => {
            if (!prevData) return null;
            return {
              ...prevData,
              description: aiDescription
            };
          });
        } else {
          console.warn('Skipping description generation due to missing place name');
        }
      } catch (descError) {
        console.error('Error generating AI description:', descError);
        // Keep the default description - no need to show error to user
      } finally {
        setGeneratingDescription(false);
      }
    } catch (err) {
      console.error('Error fetching place data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch place data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (updatedData: LocationFormData) => {
    setFormData(updatedData);
  };

  const saveLocation = async () => {
    if (!formData) {
      setError('Please fetch location data first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageProcessingStatus(null);

    try {
      // Ensure we're using the Google Place ID as our internal ID
      const locationId = formData.id;
      
      // Validate that we have a non-empty ID
      if (!locationId || locationId.trim() === '') {
        throw new Error('Missing Place ID. Please try fetching the location details again.');
      }
      
    console.log('Saving location with ID:', locationId);
    await addLocation(formData);
    
    // Force a refresh of the locations data to update the admin UI
    await getLocations(true);
    
    // Don't show success message yet - will show after image processing
      
      // Process images if the location has placeData with photoUrls
      if (formData.placeData?.photoUrls && formData.placeData.photoUrls.length > 0) {
        try {
          setIsProcessingImages(true);
          setImageProcessingStatus({
            message: 'Processing images for permanent storage...',
            type: 'info'
          });
          
          // Get admin token
          const adminToken = localStorage.getItem('adminToken');
          if (!adminToken) {
            throw new Error('Admin token not found. Please log in again.');
          }
          
          // Call the background function to process images - fire and forget
          fetch('/api/store-location-photos-background', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
              locationId
            })
          }).then(response => {
            console.log('Background image processing initiated:', response.status);
          }).catch(error => {
            console.warn('Error initiating background image processing:', error);
            // Non-blocking, so we don't throw the error
          });
          
          // Set status for user feedback
          setImageProcessingStatus({
            message: 'Images will be processed in the background. You can continue using the app.',
            type: 'success'
          });
        } catch (error) {
          console.error('Error initiating image processing:', error);
          setImageProcessingStatus({
            message: `Failed to initiate image processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'error'
          });
        } finally {
          setIsProcessingImages(false);
          
          // Show success message immediately, don't wait for images
          alert('Location added successfully! Images will be processed in the background.');
        }
      } else {
        // If no images to process, show success message immediately
        alert('Location added successfully!');
      }
    
    // Clear form data regardless of image processing status
      setPlaceId('');
      setFormData(null);
      if (onLocationAdded) {
        onLocationAdded();
      }
    } catch (err) {
      console.error('Error saving location:', err);
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Add New Location</h3>
        <p className="text-sm text-gray-500 mb-4">
          Search for a location or enter a Google Place ID to add it to the database.
        </p>
        
        <div className="space-y-4">
          {/* Place Search */}
          <div>
            <h4 className="text-sm font-medium mb-2">Search for a place</h4>
            <PlaceSearch
              onPlaceSelected={(place) => {
                const selectedPlaceId = place.placeId;
                console.log('Place selected with ID:', selectedPlaceId);
                setPlaceId(selectedPlaceId);
                fetchPlace(selectedPlaceId);
              }}
              placeholder="Search for a location in Athens..."
            />
          </div>
          
          {/* Divider */}
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-sm text-gray-500">OR</span>
            </div>
          </div>
          
          {/* Manual Place ID Input */}
          <div>
            <h4 className="text-sm font-medium mb-2">Enter a Google Place ID manually</h4>
            <div className="flex">
              <input
                type="text"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Enter Google Place ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              />
              <button
                onClick={() => fetchPlace(placeId)}
                disabled={isLoading || !placeId.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isLoading ? 'Loading...' : 'Fetch'}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {formData && (
        <div className="mt-6 border rounded-md p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-4">Location Preview</h3>
          
          {/* Display AI description generation status */}
          {generatingDescription && (
            <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-600 rounded">
              <span className="animate-pulse">Generating AI description...</span>
              <p className="text-xs mt-1">This may take a few moments as we create a custom description.</p>
            </div>
          )}
          
          <LocationForm
            formData={formData}
            onChange={handleFormChange}
            isProcessing={isLoading || generatingDescription}
          />
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setFormData(null)}
              className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading || isProcessingImages}
            >
              Cancel
            </button>
            <button
              onClick={saveLocation}
              disabled={isLoading || generatingDescription || isProcessingImages}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isLoading ? 'Saving...' : 'Save Location'}
            </button>
          </div>
          
          {/* Image Processing Status */}
          {(isProcessingImages || imageProcessingStatus) && (
            <div className="mt-4">
              {isProcessingImages && (
                <div className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-md">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing images for permanent storage. This may take a moment...</span>
                </div>
              )}
              
              {!isProcessingImages && imageProcessingStatus && (
                <div className={`p-3 rounded-md ${
                  imageProcessingStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                  imageProcessingStatus.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <div className="flex items-center">
                    {imageProcessingStatus.type === 'success' && (
                      <svg className="h-5 w-5 mr-2 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {imageProcessingStatus.type === 'error' && (
                      <svg className="h-5 w-5 mr-2 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {imageProcessingStatus.type === 'info' && (
                      <svg className="h-5 w-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>{imageProcessingStatus.message}</span>
                  </div>
                  
                  {imageProcessingStatus.type === 'success' && imageProcessingStatus.photoCount && (
                    <p className="mt-1 ml-7 text-sm">
                      {imageProcessingStatus.photoCount} {imageProcessingStatus.photoCount === 1 ? 'image has' : 'images have'} been stored permanently in Firebase Storage.
                    </p>
                  )}
                  
                  {imageProcessingStatus.type === 'error' && (
                    <p className="mt-1 ml-7 text-sm">
                      The location was saved successfully, but there was an issue storing the images permanently. Google-provided image URLs will still work but may expire after a few days.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddLocationForm;