import React, { useState, useEffect } from 'react';
import { getLocations, deleteLocation } from '../../utils/firebase-service';
import { Location } from '../../types/location';
import LocationEditor from './LocationEditor';

const LocationsList: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const locationData = await getLocations();
        setLocations(locationData);
        setError(null);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [refreshKey]);

  const handleEdit = (locationId: string) => {
    setEditingLocationId(locationId);
  };

  const handleDelete = async (locationId: string, locationName: string) => {
    if (window.confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      try {
        await deleteLocation(locationId);
        setRefreshKey(prev => prev + 1); // Refresh the list
        alert(`"${locationName}" has been deleted successfully.`);
      } catch (err) {
        console.error('Error deleting location:', err);
        alert(`Failed to delete "${locationName}". Please try again.`);
      }
    }
  };

  const handleEditorClosed = () => {
    setEditingLocationId(null);
  };

  const handleLocationSaved = () => {
    setRefreshKey(prev => prev + 1); // Refresh the list
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md my-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Location Editor Modal */}
      {editingLocationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal-backdrop">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl z-modal-container">
            <LocationEditor
              locationId={editingLocationId}
              onClose={handleEditorClosed}
              onSaved={handleLocationSaved}
            />
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Range</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No locations found. Add a location to get started.
                </td>
              </tr>
            ) : (
              locations.map(location => (
                <tr key={location.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{location.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      location.primaryType === 'indoor-play' ? 'bg-purple-100 text-purple-800' :
                      location.primaryType === 'outdoor-play' ? 'bg-green-100 text-green-800' :
                      location.primaryType === 'sports' ? 'bg-orange-100 text-orange-800' :
                      location.primaryType === 'arts' ? 'bg-pink-100 text-pink-800' :
                      location.primaryType === 'music' ? 'bg-blue-100 text-blue-800' :
                      location.primaryType === 'education' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {location.primaryType}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.ageRange.min}-{location.ageRange.max} years
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {location.address}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      onClick={() => handleEdit(location.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(location.id, location.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationsList;