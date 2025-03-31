import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConsent } from './ConsentContext';

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
  requestLocationPermission: () => void;
  resetLocationPermission: () => void;
}

// Create the context with default values
const UserLocationContext = createContext<LocationContextType>({
  userLocation: DEFAULT_LOCATION,
  locationLoaded: false,
  locationError: null,
  permissionStatus: 'unknown',
  requestLocationPermission: () => {},
  resetLocationPermission: () => {}
});

// Custom hook for easy context usage
export const useUserLocation = () => useContext(UserLocationContext);

// Provider component that will wrap the app
export const UserLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the consent context to check for location permission
  const { locationConsent, setLocationConsent } = useConsent();
  
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');

  // Function to request location permission and get position
  // Use useCallback to memoize the function
  const requestLocationPermission = React.useCallback(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported by browser');
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoaded(true);
      setPermissionStatus('unknown');
      return;
    }
    
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
        
        // Update consent context
        setLocationConsent(true);
      },
      (error) => {
        console.log('Geolocation error or permission denied:', error.message);
        setLocationError('Unable to get your location: ' + error.message);
        setLocationLoaded(true);
        setPermissionStatus('denied');
        
        // Use default location when permission is denied
        localStorage.setItem('user_location', JSON.stringify(DEFAULT_LOCATION));
        localStorage.setItem('user_location_permission', 'denied');
        localStorage.setItem('user_location_denied_time', Date.now().toString());
        
        // Update consent context
        setLocationConsent(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 * 30 // Cache for 30 minutes
      }
    );
  }, [setLocationConsent]); // Add dependencies for the callback

  useEffect(() => {
    // If consent status is explicitly set (true or false), use that
    if (locationConsent !== null) {
      console.log(`Location consent from context: ${locationConsent ? 'granted' : 'denied'}`);
      
      if (locationConsent) {
        // Check for saved location first
        const savedLocation = localStorage.getItem('user_location');
        if (savedLocation) {
          try {
            const parsedLocation = JSON.parse(savedLocation);
            if (parsedLocation && typeof parsedLocation.lat === 'number' && typeof parsedLocation.lng === 'number') {
              console.log('Using saved location from localStorage with consent granted');
              setUserLocation(parsedLocation);
              setLocationLoaded(true);
              setPermissionStatus('granted');
              return;
            }
          } catch (error) {
            console.error('Error parsing saved location:', error);
          }
        }
        
        // If no saved location or parsing failed, request a new one
        requestLocationPermission();
      } else {
        // User has explicitly denied location consent
        console.log('User has denied location consent, using default location');
        setUserLocation(DEFAULT_LOCATION);
        setLocationLoaded(true);
        setPermissionStatus('denied');
      }
      return;
    }
    
    // If consent is null (not yet decided), check legacy permissions
    
    // Check for saved permission status from previous sessions
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
            
            // Update consent context to match legacy permissions
            setLocationConsent(true);
            return;
          }
        } catch (error) {
          console.error('Error parsing saved location:', error);
        }
      }
    }
    
    // If permission was previously denied, use default location
    if (savedPermissionStatus === 'denied') {
      const deniedTimestamp = localStorage.getItem('user_location_denied_time');
      if (deniedTimestamp) {
        const deniedTime = parseInt(deniedTimestamp, 10);
        const currentTime = Date.now();
        const hoursElapsed = (currentTime - deniedTime) / (1000 * 60 * 60);
        
        if (hoursElapsed < 24) {
          console.log('Using default location - permission was denied within the last 24 hours');
          setUserLocation(DEFAULT_LOCATION);
          setLocationLoaded(true);
          setPermissionStatus('denied');
          
          // Update consent context to match legacy permissions
          setLocationConsent(false);
          return;
        }
      }
    }

    // If we get here, we don't have a consent decision yet
    // Don't automatically request location - wait for explicit consent through the welcome modal
    console.log('No location consent decision yet, using default location until user grants permission');
    setUserLocation(DEFAULT_LOCATION);
    setLocationLoaded(true);
    setPermissionStatus('prompt');
    
  }, [locationConsent, setLocationConsent, requestLocationPermission]);

  // Function to reset location permission status
  const resetLocationPermission = () => {
    localStorage.removeItem('user_location_permission');
    localStorage.removeItem('user_location_denied_time');
    setPermissionStatus('prompt');
    setLocationConsent(null); // Reset in the consent context
  };

  const contextValue = {
    userLocation,
    locationLoaded,
    locationError,
    permissionStatus,
    requestLocationPermission,
    resetLocationPermission
  };

  return (
    <UserLocationContext.Provider value={contextValue}>
      {children}
    </UserLocationContext.Provider>
  );
};

export default UserLocationProvider;