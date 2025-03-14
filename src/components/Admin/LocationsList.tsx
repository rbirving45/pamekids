import React, { useState, useEffect, useMemo } from 'react';
import { getLocations, deleteLocation } from '../../utils/firebase-service';
import { Location } from '../../types/location';
import LocationEditor from './LocationEditor';

// Define supported sort options
type SortField = 'name' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

const LocationsList: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [minAgeFilter, setMinAgeFilter] = useState<number | null>(null);
  const [maxAgeFilter, setMaxAgeFilter] = useState<number | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isMounted = true;
    
    // Use a more discreet console group for debugging
    const fetchId = Math.random().toString(36).substring(2, 8);
    
    const fetchLocations = async () => {
      try {
        if (isMounted) setIsLoading(true);
        
        // More discreet log that won't clutter the console as much
        if (process.env.NODE_ENV === 'development') {
          console.groupCollapsed(`Locations fetch [${fetchId}]`);
          console.log('Starting location fetch operation...');
          console.groupEnd();
        }
        
        // Force refresh from Firebase when the admin component loads
        const locationData = await getLocations(true);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setLocations(locationData);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error fetching locations [${fetchId}]:`, err);
        if (isMounted) {
          setError('Failed to load locations. Please try again.');
          setIsLoading(false);
        }
      }
    };

    fetchLocations();
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleEdit = (locationId: string) => {
    setEditingLocationId(locationId);
  };

  const handleDelete = async (locationId: string, locationName: string) => {
    if (window.confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      try {
        await deleteLocation(locationId);
        
        // Force a refresh immediately after deletion
        await getLocations(true);
        setRefreshKey(prev => prev + 1); // Refresh the list component
        
        alert(`"${locationName}" has been deleted successfully.`);
      } catch (err) {
        console.error('Error deleting location:', err);
        alert(`Failed to delete "${locationName}". Please try again.`);
      }
    }
  };

  // Helper function to format timestamp for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    // Handle Firestore timestamp objects
    if (typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle ISO string dates
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Ensure all locations have a valid ID to use as a key
  // Filter locations based on search query and filters
  const filteredLocations = useMemo(() => {
    return locations
      .filter(location => {
        // Filter by activity type
        if (activityTypeFilter !== 'all' && location.primaryType !== activityTypeFilter) {
          return false;
        }
        
        // Filter by age range
        if (minAgeFilter !== null && location.ageRange.max < minAgeFilter) {
          return false;
        }
        if (maxAgeFilter !== null && location.ageRange.min > maxAgeFilter) {
          return false;
        }
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            location.name.toLowerCase().includes(query) ||
            location.address.toLowerCase().includes(query)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by selected field
        if (sortField === 'name') {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return sortDirection === 'asc'
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        
        if (sortField === 'created_at' || sortField === 'updated_at') {
          // Get timestamp values, defaulting to 0 if not available
          const timeA = a[sortField]?.seconds || 0;
          const timeB = b[sortField]?.seconds || 0;
          
          return sortDirection === 'asc'
            ? timeA - timeB  // Oldest to newest
            : timeB - timeA; // Newest to oldest
        }
        
        return 0;
      });
  }, [locations, searchQuery, activityTypeFilter, minAgeFilter, maxAgeFilter, sortField, sortDirection]);

  // Ensure all locations have a valid ID to use as a key
  const locationsWithValidKeys = filteredLocations.map((location, index) => {
    if (!location.id) {
      return { ...location, id: `location-${index}` };
    }
    return location;
  });

  const handleEditorClosed = () => {
    setEditingLocationId(null);
  };

  const handleLocationSaved = () => {
    setRefreshKey(prev => prev + 1); // Refresh the list
  };
  
  // Activity type options for filter dropdown
  const activityTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'indoor-play', label: 'Indoor Play' },
    { value: 'outdoor-play', label: 'Outdoor Play' },
    { value: 'sports', label: 'Sports' },
    { value: 'arts', label: 'Arts' },
    { value: 'music', label: 'Music' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' }
  ];

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

      {/* Search and Filter Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* Activity Type Filter */}
          <div>
            <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type
            </label>
            <select
              id="activityType"
              value={activityTypeFilter}
              onChange={(e) => setActivityTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {activityTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Age Range Filter - Min Age */}
          <div>
            <label htmlFor="minAge" className="block text-sm font-medium text-gray-700 mb-1">
              Min Age
            </label>
            <select
              id="minAge"
              value={minAgeFilter === null ? '' : minAgeFilter.toString()}
              onChange={(e) => setMinAgeFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Any</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map(age => (
                <option key={age} value={age}>
                  {age} years
                </option>
              ))}
            </select>
          </div>
          
          {/* Age Range Filter - Max Age */}
          <div>
            <label htmlFor="maxAge" className="block text-sm font-medium text-gray-700 mb-1">
              Max Age
            </label>
            <select
              id="maxAge"
              value={maxAgeFilter === null ? '' : maxAgeFilter.toString()}
              onChange={(e) => setMaxAgeFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Any</option>
              {[2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18].map(age => (
                <option key={age} value={age}>
                  {age} years
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Sort Controls */}
        <div className="mt-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            
            <div className="flex">
              <button
                onClick={() => {
                  setSortField('name');
                  setSortDirection(sortField === 'name' && sortDirection === 'asc' ? 'desc' : 'asc');
                }}
                className={`px-3 py-1 text-sm rounded-l ${
                  sortField === 'name'
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              
              <button
                onClick={() => {
                  setSortField('created_at');
                  setSortDirection(sortField === 'created_at' && sortDirection === 'desc' ? 'asc' : 'desc');
                }}
                className={`px-3 py-1 text-sm ${
                  sortField === 'created_at'
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Date Added {sortField === 'created_at' && (sortDirection === 'desc' ? '↓' : '↑')}
              </button>
              
              <button
                onClick={() => {
                  setSortField('updated_at');
                  setSortDirection(sortField === 'updated_at' && sortDirection === 'desc' ? 'asc' : 'desc');
                }}
                className={`px-3 py-1 text-sm rounded-r ${
                  sortField === 'updated_at'
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Last Updated {sortField === 'updated_at' && (sortDirection === 'desc' ? '↓' : '↑')}
              </button>
            </div>
            
            {/* Filter Reset Button */}
            <div className="ml-auto">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActivityTypeFilter('all');
                  setMinAgeFilter(null);
                  setMaxAgeFilter(null);
                  setSortField('name');
                  setSortDirection('asc');
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="overflow-x-auto">
        {locations.length > 0 && (
          <p className="text-sm text-gray-500 mb-2">
            Showing {locationsWithValidKeys.length} of {locations.length} locations
            {(searchQuery || activityTypeFilter !== 'all' || minAgeFilter !== null || maxAgeFilter !== null) &&
              " (filtered results)"}
          </p>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Range</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added / Updated</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locationsWithValidKeys.length === 0 ? (
              <tr key="empty-row">
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  {locations.length === 0 ?
                    "No locations found. Add a location to get started." :
                    "No locations match your search criteria. Try adjusting your filters."}
                </td>
              </tr>
            ) : (
              locationsWithValidKeys.map(location => (
                <tr key={location.id || `fallback-${Math.random()}`}>
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Added: {formatTimestamp(location.created_at)}</div>
                    <div>Updated: {formatTimestamp(location.updated_at)}</div>
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