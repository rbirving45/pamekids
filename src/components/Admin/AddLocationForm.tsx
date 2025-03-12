import React, { useState } from 'react';
import { addLocation } from '../../utils/firebase-service';
import { fetchPlaceDetails } from '../../utils/places-api';
import PlaceSearch from './PlaceSearch';

const activityTypeMapping: Record<string, string> = {
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
  const [previewData, setPreviewData] = useState<any | null>(null);

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
      let primaryType = 'entertainment'; // Default
      
      if (placeData.types && placeData.types.length > 0) {
        for (const type of placeData.types) {
          if (activityTypeMapping[type]) {
            primaryType = activityTypeMapping[type];
            break;
          }
        }
      }
      
      // Format the place data for preview
      const formattedData = {
        id: placeId,
        name: placeData.name,
        coordinates: {
          lat: placeData.geometry?.location.lat() || 0,
          lng: placeData.geometry?.location.lng() || 0
        },
        placeData: {
          rating: placeData.rating,
          userRatingsTotal: placeData.userRatingsTotal
        },
        address: placeData.address || placeData.formatted_address,
        types: [primaryType],
        primaryType: primaryType,
        ageRange: {
          min: primaryType === 'education' ? 3 : 0,
          max: 16
        },
        description: `${placeData.name} is a great place for kids in Athens. Suitable for various age groups.`,
        openingHours: placeData.hours || {},
        priceRange: placeData.priceLevel ? '$'.repeat(placeData.priceLevel) : '$',
        contact: {
          phone: placeData.phone || placeData.formatted_phone_number || '',
          email: `contact@${placeData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          website: placeData.website || ''
        }
      };

      setPreviewData(formattedData);
    } catch (err) {
      console.error('Error fetching place data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch place data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocation = async () => {
    if (!previewData) {
      setError('Please fetch location data first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await addLocation(previewData);
      setPlaceId('');
      setPreviewData(null);
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
                setPlaceId(place.placeId);
                fetchPlace(place.placeId);
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

      {previewData && (
        <div className="mt-6 border rounded-md p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-4">Location Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Name</p>
              <p className="text-lg font-semibold">{previewData.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Primary Type</p>
              <p>{previewData.primaryType}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p>{previewData.address}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Age Range</p>
              <p>{previewData.ageRange.min} - {previewData.ageRange.max} years</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Contact</p>
              <p>Phone: {previewData.contact.phone || 'N/A'}</p>
              <p>Website: {previewData.contact.website || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Coordinates</p>
              <p>Lat: {previewData.coordinates.lat}, Lng: {previewData.coordinates.lng}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600">Description</p>
            <textarea
              value={previewData.description}
              onChange={(e) => setPreviewData({...previewData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setPreviewData(null)}
              className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={saveLocation}
              disabled={isLoading}
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