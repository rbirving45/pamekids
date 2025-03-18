import React, { useState } from 'react';
import { addLocation, getLocations } from '../../utils/firebase-service';
import { fetchPlaceDetails } from '../../utils/places-api';
import { generatePlaceDescription } from '../../utils/description-generator';
import PlaceSearch from './PlaceSearch';
import LocationForm, { LocationFormData } from './LocationForm';
import { ActivityType } from '../../types/location';

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

      // Fetch place details using your existing utility
      const placeData = await fetchPlaceDetails(placeIdToFetch, window.google.maps);
      
      // Update the placeId state if using a provided ID
      if (id) {
        setPlaceId(id);
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
      
      // Prepare the initial form data
      const initialFormData: LocationFormData = {
        id: placeIdToFetch,
        name: placeData.name,
        coordinates: coordinates,
        types: [primaryType],
        primaryType: primaryType,
        address: placeData.address || placeData.formatted_address,
        ageRange: {
          min: primaryType === 'education' ? 3 : 0,
          max: 16
        },
        description: `${placeData.name} is a great place for kids in Athens. Suitable for various age groups.`,
        openingHours: placeData.hours || {},
        priceRange: placeData.priceLevel ? '€'.repeat(placeData.priceLevel) : '€',
        contact: {
          phone: placeData.phone || placeData.formatted_phone_number || '',
          email: ``,
          website: placeData.website || ''
        },
        proTips: '' // Initialize with empty string for proTips
      };

      // Set form data
      setFormData(initialFormData);
      
      // Generate AI description
      try {
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
      
      setPlaceId('');
      setFormData(null);
      if (onLocationAdded) {
        onLocationAdded();
      }
      alert('Location added successfully!');
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
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={saveLocation}
              disabled={isLoading || generatingDescription}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isLoading ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddLocationForm;