import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocations } from '../utils/firebase-service';
import { Location } from '../types/location';

// Type definition for the context
interface LocationsContextType {
  allLocations: Location[];
  isLoading: boolean;
  error: string | null;
  refreshLocations: () => Promise<void>;
}

// Create the context with a default value
const LocationsContext = createContext<LocationsContextType>({
  allLocations: [],
  isLoading: true,
  error: null,
  refreshLocations: async () => {}
});

// Hook for using the context
export const useLocations = (): LocationsContextType => {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationsProvider');
  }
  return context;
};

// Provider component
export const LocationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch locations from Firebase
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const locations = await getLocations();
      setAllLocations(locations);
      return locations;
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations. Please try again.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function that can be called to reload data
  const refreshLocations = async () => {
    await fetchLocations();
  };

  // Initial data loading
  useEffect(() => {
    fetchLocations();
  }, []);

  // Context value
  const contextValue = {
    allLocations,
    isLoading,
    error,
    refreshLocations
  };

  return (
    <LocationsContext.Provider value={contextValue}>
      {children}
    </LocationsContext.Provider>
  );
};