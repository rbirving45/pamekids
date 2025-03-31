import React, { createContext, useContext, useState, useEffect } from 'react';

// Default location for Athens center
const DEFAULT_LOCATION = { lat: 37.9838, lng: 23.7275 };

// Permission status types
type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

// Define the shape of our location context
interface LocationContextType {
  userLocation: { lat: number; lng: number };
  locationLoaded: boolean;
  locationError: string | null;
  permissionStatus: PermissionStatus;
  resetLocationPermission: () => void;
}

// Create the context with default values
const UserLocationContext = createContext<LocationContextType>({
  userLocation: DEFAULT_LOCATION,
  locationLoaded: false,
  locationError: null,
  permissionStatus: 'unknown',
  resetLocationPermission: () => {}
});

// Custom hook for easy context usage
export const useUserLocation = () => useContext(UserLocationContext);

// Provider component that will wrap the app
export const UserLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');

  useEffect(() => {
    // Check for saved permission status
    const savedPermissionStatus = localStorage.getItem('user_location_permission');
    
    // If we've previously been granted permission, use the saved location
    if (savedPermissionStatus === 'granted') {
      const savedLocation = localStorage.getItem('user_location');
      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          if (parsedLocation && typeof parsedLocation.lat === 'number' && typeof parsedLocation.lng === 'number') {
            console.log('Using saved location from localStorage with granted permission');
            setUserLocation(parsedLocation);
            setLocationLoaded(true);
            setPermissionStatus('granted');
            return;
          }
        } catch (error) {
          console.error('Error parsing saved location:', error);
          // Continue to request a fresh location if parse fails
        }
      }
    }
    
    // If permission was previously denied, check the timestamp
    if (savedPermissionStatus === 'denied') {
      const deniedTimestamp = localStorage.getItem('user_location_denied_time');
      if (deniedTimestamp) {
        const deniedTime = parseInt(deniedTimestamp, 10);
        const currentTime = Date.now();
        const hoursElapsed = (currentTime - deniedTime) / (1000 * 60 * 60);
        
        // If less than 24 hours have passed, use the default location
        if (hoursElapsed < 24) {
          console.log('Using default location - permission was denied within the last 24 hours');
          setUserLocation(DEFAULT_LOCATION);
          setLocationLoaded(true);
          setPermissionStatus('denied');
          return;
        } else {
          // More than 24 hours passed, clear the denied status to re-prompt
          console.log('24+ hours since location permission was denied, will re-prompt');
          localStorage.removeItem('user_location_permission');
          localStorage.removeItem('user_location_denied_time');
        }
      }
    }

    // Request location if permission status is unknown, prompt, or denied more than 24 hours ago
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
          setPermissionStatus('granted');
          
          // Save to localStorage for persistence
          localStorage.setItem('user_location', JSON.stringify(newLocation));
          localStorage.setItem('user_location_permission', 'granted');
        },
        (error) => {
          console.log('Geolocation error or permission denied:', error.message);
          setLocationError('Unable to get your location: ' + error.message);
          setLocationLoaded(true); // Consider loaded but with error
          setPermissionStatus('denied');
          
          // Use default location when permission is denied
          localStorage.setItem('user_location', JSON.stringify(DEFAULT_LOCATION));
          localStorage.setItem('user_location_permission', 'denied');
          localStorage.setItem('user_location_denied_time', Date.now().toString());
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
      setPermissionStatus('unknown');
      
      // Use default location when geolocation is not supported
      localStorage.setItem('user_location', JSON.stringify(DEFAULT_LOCATION));
    }
  }, []);

  // Function to reset location permission status
  const resetLocationPermission = () => {
    localStorage.removeItem('user_location_permission');
    localStorage.removeItem('user_location_denied_time');
    setPermissionStatus('prompt');
  };

  const contextValue = {
    userLocation,
    locationLoaded,
    locationError,
    permissionStatus,
    resetLocationPermission
  };

  return (
    <UserLocationContext.Provider value={contextValue}>
      {children}
    </UserLocationContext.Provider>
  );
};

export default UserLocationProvider;