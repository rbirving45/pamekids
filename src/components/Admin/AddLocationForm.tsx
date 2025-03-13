import React, { useState } from 'react';
import { addLocation } from '../../utils/firebase-service';
import { fetchPlaceDetails } from '../../utils/places-api';
import { generatePlaceDescription } from '../../utils/description-generator';
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
      let primaryType = 'entertainment'; // Default
      
      if (placeData.types && placeData.types.length > 0) {
        for (const type of placeData.types) {
          if (activityTypeMapping[type]) {
            primaryType = activityTypeMapping[type];
            break;
          }
        }
      }
      
      // Format the place data for preview with a default description initially
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
        priceRange: placeData.priceLevel ? '€'.repeat(placeData.priceLevel) : '€',
        contact: {
          phone: placeData.phone || placeData.formatted_phone_number || '',
          email: `contact@${placeData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          website: placeData.website || ''
        },
        proTips: '' // Initialize with empty string for proTips
      };

      // Set preview data with default description first
      setPreviewData(formattedData);
      
      // Generate AI description
      try {
        setGeneratingDescription(true);
        const aiDescription = await generatePlaceDescription(placeData);
        
        // Update the formattedData with the AI-generated description
        setPreviewData((prevData: any) => ({
          ...prevData,
          description: aiDescription
        }));
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
              <label className="text-sm font-medium text-gray-600">Name</label>
              <input
                type="text"
                value={previewData.name}
                onChange={(e) => setPreviewData({...previewData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Primary Type</label>
              <select
                value={previewData.primaryType}
                onChange={(e) => {
                  const newPrimaryType = e.target.value;
                  // Ensure the primary type is included in the types array
                  const newTypes = previewData.types.includes(newPrimaryType)
                    ? previewData.types
                    : [...previewData.types, newPrimaryType];
                  
                  setPreviewData({
                    ...previewData,
                    primaryType: newPrimaryType,
                    types: newTypes
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="indoor-play">Indoor Play</option>
                <option value="outdoor-play">Outdoor Play</option>
                <option value="sports">Sports</option>
                <option value="arts">Arts</option>
                <option value="music">Music</option>
                <option value="education">Education</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Additional Types</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {['indoor-play', 'outdoor-play', 'sports', 'arts', 'music', 'education', 'entertainment'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={previewData.types.includes(type)}
                      onChange={(e) => {
                        let newTypes = [...previewData.types];
                        if (e.target.checked) {
                          if (!newTypes.includes(type)) {
                            newTypes.push(type);
                          }
                        } else {
                          // Don't allow removing the primary type
                          if (type !== previewData.primaryType) {
                            newTypes = newTypes.filter(t => t !== type);
                          }
                        }
                        setPreviewData({...previewData, types: newTypes});
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{type.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Address</label>
              <input
                type="text"
                value={previewData.address}
                onChange={(e) => setPreviewData({...previewData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Age Range</label>
              <div className="flex items-center space-x-2 mt-1">
                <select
                  value={previewData.ageRange.min}
                  onChange={(e) => {
                    const min = parseInt(e.target.value);
                    const max = Math.max(min, previewData.ageRange.max);
                    setPreviewData({
                      ...previewData,
                      ageRange: { min, max }
                    });
                  }}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Array.from({ length: 18 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <span>to</span>
                <select
                  value={previewData.ageRange.max}
                  onChange={(e) => {
                    const max = parseInt(e.target.value);
                    setPreviewData({
                      ...previewData,
                      ageRange: { ...previewData.ageRange, max }
                    });
                  }}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Array.from({ length: 18 - previewData.ageRange.min }, (_, i) => i + previewData.ageRange.min).map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Contact</label>
              <div className="space-y-2 mt-1">
                <div>
                  <label className="text-xs text-gray-500">Phone:</label>
                  <input
                    type="text"
                    value={previewData.contact.phone || ''}
                    onChange={(e) => setPreviewData({
                      ...previewData,
                      contact: {...previewData.contact, phone: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Website:</label>
                  <input
                    type="text"
                    value={previewData.contact.website || ''}
                    onChange={(e) => setPreviewData({
                      ...previewData,
                      contact: {...previewData.contact, website: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Website URL"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between">
              <p className="text-sm font-medium text-gray-600">Description</p>
              {generatingDescription && (
                <span className="text-xs text-blue-600 animate-pulse">
                  Generating AI description...
                </span>
              )}
            </div>
            <textarea
              value={previewData.description}
              onChange={(e) => setPreviewData({...previewData, description: e.target.value})}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${generatingDescription ? 'bg-gray-50' : ''}`}
              rows={3}
              disabled={generatingDescription}
            />
            <p className="text-xs text-gray-500 mt-1">
              {generatingDescription
                ? "AI is creating a custom description based on location data..."
                : "You can edit this description if needed."}
            </p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600">Pro Tips</p>
            <textarea
              value={previewData.proTips || ''}
              onChange={(e) => setPreviewData({...previewData, proTips: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              placeholder="Add insider tips from people who've visited this location..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide practical, insider tips that aren't in the main description. Separate multiple tips with bullet points.
            </p>
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