import React, { useState } from 'react';
import { addLocation, getLocations } from '../../utils/firebase-service';
import { fetchPlaceDetails } from '../../utils/places-api';
import { generatePlaceDescription } from '../../utils/description-generator';
import { ActivityType } from '../../types/location';

// Activity type mapping similar to your existing batch-process.js
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

interface BatchAddLocationsProps {
  onComplete?: () => void;
}

const BatchAddLocations: React.FC<BatchAddLocationsProps> = ({ onComplete }) => {
  const [placeIds, setPlaceIds] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Array<{ id: string; name: string; success: boolean; error?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const processPlaceIds = async () => {
    if (!placeIds.trim()) {
      setError('Please enter at least one Google Place ID');
      return;
    }

    // Split input by commas or line breaks and clean up
    const ids = placeIds
      .split(/[\n,]/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      setError('No valid Place IDs found');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: ids.length });
    setResults([]);
    setError(null);

    // Process each place ID with a slight delay to avoid rate limits
    for (let i = 0; i < ids.length; i++) {
      const placeId = ids[i];
      setProgress({ current: i + 1, total: ids.length });

      try {
        // Get the Google Maps API instance
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps API not loaded');
        }

        // Fetch place details
        const placeData = await fetchPlaceDetails(placeId, window.google.maps);
        
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
        
        // Prepare the place data with a temporary description
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
        
        const formattedData = {
          id: placeId,
          name: placeData.name,
          coordinates: coordinates,
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
          },
          proTips: '' // Initialize with empty string for proTips
        };

        // Try to generate an AI description
        try {
          // Update results to show description generation
          setResults(prev => [
            ...prev.filter(r => r.id !== placeId),
            { id: placeId, name: placeData.name, success: false, error: 'Generating AI description...' }
          ]);
          
          const aiDescription = await generatePlaceDescription(placeData);
          formattedData.description = aiDescription;
        } catch (descError) {
          console.error(`Error generating AI description for ${placeData.name}:`, descError);
          // Keep the default description
        }

        // Add to Firebase - ensure we're using the Place ID as the document ID
        const locationData = {
          ...formattedData,
          id: placeId // Explicitly set the ID to be the Google Place ID
        };
        
        // Logging to verify the ID is set
        console.log(`Adding location with Place ID: ${placeId}`);
        await addLocation(locationData);
        
        // Update results
        setResults(prev => [
          ...prev,
          { id: placeId, name: placeData.name, success: true }
        ]);
      } catch (err) {
        console.error(`Error processing Place ID ${placeId}:`, err);
        setResults(prev => [
          ...prev,
          {
            id: placeId,
            name: `Unknown (${placeId})`,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        ]);
      }

      // Add a delay between requests to avoid hitting rate limits
      if (i < ids.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    
    // Force a refresh of the locations data
    await getLocations(true);
    
    // Notify the parent component to refresh its view
    if (onComplete) onComplete();
  };

  const successCount = results.filter(result => result.success).length;
  const failCount = results.length - successCount;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Batch Add Locations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter multiple Google Place IDs separated by commas or line breaks. This will process them in sequence and add them to your database.
        </p>

        <textarea
          value={placeIds}
          onChange={(e) => setPlaceIds(e.target.value)}
          placeholder="Enter Google Place IDs (one per line or comma-separated)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          rows={5}
          disabled={isProcessing}
        />

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={processPlaceIds}
          disabled={isProcessing || !placeIds.trim()}
          className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isProcessing ? 'Processing...' : 'Process Place IDs'}
        </button>
      </div>

      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Processing locations...</span>
            <span className="text-sm text-gray-500">{progress.current} of {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 border rounded-md p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-2">Results</h3>
          <div className="mb-4 flex space-x-4">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              Success: {successCount}
            </div>
            {failCount > 0 && (
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                Failed: {failCount}
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {result.success ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full">Success</span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded-full">Failed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">{result.id}</td>
                    <td className="px-3 py-2 text-sm">{result.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {result.error || 'Added successfully'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchAddLocations;