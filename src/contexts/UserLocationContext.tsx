import React, { createContext, useContext, useState, useEffect } from 'react';

// Default location for Athens center
const DEFAULT_LOCATION = { lat: 37.9838, lng: 23.7275 };

// Define the shape of our location context
interface LocationContextType {
  userLocation: { lat: number; lng: number };
  locationLoaded: boolean;
  locationError: string | null;
}

// Create the context with default values
const UserLocationContext = createContext<LocationContextType>({
  userLocation: DEFAULT_LOCATION,
  locationLoaded: false,
  locationError: null
});

// Custom hook for easy context usage
export const useUserLocation = () => useContext(UserLocationContext);

// Provider component that will wrap the app
export const UserLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get location from localStorage first
    const savedLocation = localStorage.getItem('user_location');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && typeof parsedLocation.lat === 'number' && typeof parsedLocation.lng === 'number') {
          console.log('Using saved location from localStorage');
          setUserLocation(parsedLocation);
          setLocationLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
        // Continue to request a fresh location if parse fails
      }
    }

    // Request location if not in localStorage
    if (navigator.geolocation) {
      console.log('Requesting geolocation permission...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('Location permission granted, location received');
          
          // Save to state
          setUserLocation(newLocation);
          setLocationLoaded(true);
          
          // Save to localStorage for persistence
          localStorage.setItem('user_location', JSON.stringify(newLocation));
        },
        (error) => {
          console.log('Geolocation error or permission denied:', error.message);
          setLocationError('Unable to get your location: ' + error.message);
          setLocationLoaded(true); // Consider loaded but with error
          // Use default location when permission is denied
          localStorage.setItem('user_location', JSON.stringify(DEFAULT_LOCATION));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 * 30 // Cache for 30 minutes
        }
      );
    } else {
      console.log('Geolocation not supported by browser');
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoaded(true); // Consider loaded but with error
      // Use default location when geolocation is not supported
      localStorage.setItem('user_location', JSON.stringify(DEFAULT_LOCATION));
    }
  }, []);

  const contextValue = {
    userLocation,
    locationLoaded,
    locationError
  };

  return (
    <UserLocationContext.Provider value={contextValue}>
      {children}
    </UserLocationContext.Provider>
  );
};

export default UserLocationProvider;