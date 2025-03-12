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

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelected, placeholder = 'Search for a place...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
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
    // Define the initialization function inside useEffect
    const initAutocomplete = () => {
      if (!inputRef.current) return;

      // Initialize Google Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gr' }, // Restrict to Greece
        fields: ['place_id', 'name', 'formatted_address'],
        types: ['establishment']
      });

      // Add event listener for place selection
      autocompleteRef.current.addListener('place_changed', handlePlaceChanged);
      setIsLoaded(true);
    };

    // Check if Google Maps API is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete();
    } else {
      // The API should already be loaded by the Maps component
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkGoogleMaps);
          initAutocomplete();
        }
      }, 100);

      // Cleanup interval
      return () => clearInterval(checkGoogleMaps);
    }
  }, [handlePlaceChanged]); // Include handlePlaceChanged in the dependency array

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
      {!isLoaded && (
        <p className="text-sm text-gray-500 mt-1">Loading places search...</p>
      )}
    </div>
  );
};

export default PlaceSearch;