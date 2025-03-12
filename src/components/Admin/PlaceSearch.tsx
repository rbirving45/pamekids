import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Place {
  placeId: string;
  name: string;
  address: string;
}

interface PlaceSearchProps {
  onPlaceSelected: (place: Place) => void;
  placeholder?: string;
}

// Function to load Google Places API script if not already loaded
const loadGooglePlacesScript = () => {
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  // Return a promise that resolves when the script is loaded
  return new Promise<void>((resolve, reject) => {
    // Skip if API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Places API already loaded');
      resolve();
      return;
    }

    // Skip if script is already in the DOM
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      console.log('Google Maps script tag already exists, waiting for it to load');
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    console.log('Loading Google Places API script');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Places API script loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Places API script');
      reject(new Error('Failed to load Google Places API'));
    };
    
    document.head.appendChild(script);
  });
};

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelected, placeholder = 'Search for a place...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Define handlePlaceChanged before useEffect to avoid "used before defined" error
  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    
    if (place && place.place_id) {
      onPlaceSelected({
        placeId: place.place_id,
        name: place.name || '',
        address: place.formatted_address || ''
      });
      
      // Clear the input
      setSearchQuery('');
    }
  }, [onPlaceSelected]);

  useEffect(() => {
    let isActive = true; // Flag to prevent state updates after unmount
    
    // Define the initialization function
    const initAutocomplete = () => {
      if (!inputRef.current) return;

      try {
        // Initialize Google Places Autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'gr' }, // Restrict to Greece
          fields: ['place_id', 'name', 'formatted_address'],
          types: ['establishment']
        });

        // Add event listener for place selection
        autocompleteRef.current.addListener('place_changed', handlePlaceChanged);
        if (isActive) setIsLoaded(true);
      } catch (err) {
        console.error('Error initializing Places Autocomplete:', err);
        if (isActive) setError('Failed to initialize search. Please try reloading the page.');
      }
    };

    const setupPlaces = async () => {
      try {
        await loadGooglePlacesScript();
        if (isActive) initAutocomplete();
      } catch (err) {
        console.error('Error setting up Places API:', err);
        if (isActive) setError('Failed to load Google Places API');
      }
    };

    setupPlaces();

    // Cleanup function
    return () => {
      isActive = false;
      
      // Remove autocomplete event listener if it exists
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [handlePlaceChanged]);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        disabled={!isLoaded}
      />
      {!isLoaded && !error && (
        <p className="text-sm text-gray-500 mt-1">Loading places search...</p>
      )}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default PlaceSearch;