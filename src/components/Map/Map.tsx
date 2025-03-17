import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, LoadScriptNext, Marker, Libraries } from '@react-google-maps/api';
import Drawer from './Drawer';
import { ActivityType, Location } from '../../types/location';
import { Search, ChevronDown } from 'lucide-react';
import { trackMarkerClick, trackSearchQuery, trackSearchResultClick } from '../../utils/analytics';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';
import { useTouch } from '../../contexts/TouchContext';
import MapBlockingOverlay from './MapBlockingOverlay';
import { getLocations } from '../../utils/firebase-service';
import { performEnhancedSearch, SearchMatch } from '../../utils/search-utils';

// Using MobileContext instead of local mobile detection

// Define libraries as a static constant to prevent recreating the array on each render
// This prevents the "LoadScript has been reloaded unintentionally" warning
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapProps {
  // No longer need locations as props, as we'll fetch them from Firebase
}

// Using our enhanced SearchMatch type from search-utils.ts
type SearchResult = SearchMatch;

const activityConfig = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679' },
  'sports': { name: 'Sports', color: '#FF8C00' },
  'arts': { name: 'Arts', color: '#9C27B0' },
  'music': { name: 'Music', color: '#3F51B5' },
  'education': { name: 'Education', color: '#4285F4' },
  'entertainment': { name: 'Entertainment', color: '#FFB300' }
};

const MapComponent: React.FC<MapProps> = () => {
  // Add state for locations, loading state, and error handling
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Use context hooks for mobile detection and UI state
  const { isMobile } = useMobile();
  // Get drawer state and map blocking state from TouchContext
  const { drawerState, setDrawerState, isMapBlocked, setLocationClearCallback } = useTouch();
  // For backward compatibility with older components
  const { setDrawerOpen } = useUIState();

  // Helper function to safely get z-index from CSS variables
  const getZIndexValue = useCallback((variableName: string): number => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
    return parseInt(value.trim()) || 0; // fallback to 0 if parsing fails
  }, []);
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActivityType[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);
  const [maps, setMaps] = useState<typeof google.maps | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState({
    lat: 37.9838,
    lng: 23.7275
  });
  const [visibleLocations, setVisibleLocations] = useState<Location[]>([]);
  const [mapReady, setMapReady] = useState(false);
  // This ref was removed as we simplified the map initialization logic

  const searchRef = useRef<HTMLDivElement>(null);
  const ageDropdownRef = useRef<HTMLDivElement>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // This function has been removed as we now use a simpler approach for map positioning
  
  // Register callback to clear selected location when drawer is closed by gestures
  useEffect(() => {
    setLocationClearCallback(() => {
      // Only clear marker selection if map is already initialized
      // and there's an active selection to clear
      if (mapReady && selectedLocation) {
        console.log('Clearing marker selection due to drawer gesture close');
        setSelectedLocation(null);
        setHoveredLocation(null);
      }
    });
  }, [setLocationClearCallback, setSelectedLocation, setHoveredLocation, mapReady, selectedLocation]);
  
  // Fetch locations from Firebase on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      setLoadError(null);
      try {
        // Try to get locations from the session storage cache first
        const cachedLocations = sessionStorage.getItem('cachedLocations');
        if (cachedLocations) {
          console.log('Using cached locations data');
          setLocations(JSON.parse(cachedLocations));
          setIsLoadingLocations(false);
          
          // Fetch fresh data in the background to update the cache
          getLocations().then(freshLocations => {
            sessionStorage.setItem('cachedLocations', JSON.stringify(freshLocations));
            setLocations(freshLocations);
          }).catch(console.error);
          
          return;
        }
        
        // If no cache, fetch from Firebase
        const fetchedLocations = await getLocations();
        setLocations(fetchedLocations);
        
        // Cache the locations in session storage
        sessionStorage.setItem('cachedLocations', JSON.stringify(fetchedLocations));
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLoadError('Failed to load locations. Please try again later.');
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Get user location on component mount without a timeout to ensure we wait for user permission response
  useEffect(() => {
    const defaultLocation = { lat: 37.9838, lng: 23.7275 }; // Athens center
    
    // Initially, set map as not ready until we get location
    setMapReady(false);
    
    if (navigator.geolocation) {
      // No timeout - we'll wait for an explicit response from the user
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // User granted permission and we have their position
          const rawLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Store the raw location and signal map can render
          setUserLocation(rawLocation);
          setMapReady(true);
          console.log('Location permission granted, using user location');
        },
        (error) => {
          // User denied permission or there was an error
          console.log('Geolocation error or denied:', error.message);
          setUserLocation(defaultLocation);
          setMapReady(true);
          console.log('Using default Athens location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout to give more time for user to respond
          maximumAge: 0
        }
      );
    } else {
      // No geolocation support, use default immediately
      console.log('Geolocation not supported by browser, using default Athens location');
      setUserLocation(defaultLocation);
      setMapReady(true);
    }
  }, []);
  
  // Specialized function to position markers optimally based on context
  const centerMapOnLocation = useCallback((targetLocation: google.maps.LatLngLiteral, context?: 'marker-selection' | 'initial-load') => {
    if (!map) {
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed('Map centering - failed');
        console.log('Map not available yet');
        console.groupEnd();
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed(`Map centering - ${context || 'default'}`);
      console.log('Target:', targetLocation);
      console.log('Mobile:', isMobile);
      console.groupEnd();
    }
    
    if (isMobile) {
      try {
        // Use different offsets based on context
        if (context === 'marker-selection') {
          // For selected markers, apply a significant offset to position them above the drawer
          // Position marker approximately in the upper quarter of the screen
          // The drawer takes up about 50% of the screen, so we need to position well above that
          const markerOffset = 0.03; // Much larger offset specifically for markers
          
          const adjustedLocation = {
            lat: targetLocation.lat - markerOffset,
            lng: targetLocation.lng
          };
          
          map.panTo(adjustedLocation);
          console.log(`Mobile marker selection: using larger offset ${markerOffset} for better visibility above drawer`);
        } else {
          // For user location or other general centering, use the original smaller offset
          // This accounts for just the header/filter bar
          const defaultOffset = 0.008;
          
          const adjustedLocation = {
            lat: targetLocation.lat - defaultOffset,
            lng: targetLocation.lng
          };
          
          map.panTo(adjustedLocation);
          console.log(`Mobile default centering: using standard offset ${defaultOffset}`);
        }
      } catch (error) {
        // Fallback to simple centering if anything goes wrong
        console.error('Error in centerMapOnLocation:', error);
        map.panTo(targetLocation);
      }
    } else {
      // On desktop, simple centering is sufficient
      map.setCenter(targetLocation);
      console.log('Desktop: Set center directly');
    }
  }, [map, isMobile]);
  
  // Re-center when device type or user location changes while map is loaded
  useEffect(() => {
    if (!map || !userLocation.lat || !userLocation.lng || !mapReady) return;
    
    // The map is already initialized, so we can center immediately
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed('Map re-centering');
      console.log('Reason: device type or user location update');
      console.groupEnd();
    }
    centerMapOnLocation(userLocation, 'initial-load');
    
  }, [map, userLocation, isMobile, centerMapOnLocation, mapReady]);

  // Handle InfoWindow for marker hovering
  useEffect(() => {
    // Early exit if we don't have map or hoveredLocation
    // Add additional check to close InfoWindow when drawer is open on mobile
    // Don't show InfoWindow at all on mobile devices
    if (!map || !maps || !hoveredLocation || isMobile || (isMobile && selectedLocation)) {
      // Clean up any existing infoWindow
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      return;
    }
    
    // Create InfoWindow if it doesn't exist
    if (!infoWindowRef.current) {
      infoWindowRef.current = new maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new maps.Size(0, -30),
        maxWidth: 220
      });
    }
    
    // Create our own custom content element
    const content = document.createElement('div');
    
    // Set styles directly on the element to override Google's defaults
    // Apply more aggressive styling to counteract Google's InfoWindow padding
    content.style.cssText = `
      padding: 12px 14px;
      margin: 0;
      border-radius: 8px;
      background-color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 220px;
      transform: translateY(-8px);
    `;
    
    // Set inner HTML with better typography and more prominent design
    content.innerHTML = `
      <h3 style="
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 8px 0;
        line-height: 1.3;
      ">${hoveredLocation.name}</h3>
      <div style="
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      ">
        ${hoveredLocation.types.map(type => `
          <span
            style="
              display: inline-block;
              padding: 4px 10px;
              font-size: 13px;
              font-weight: 500;
              border-radius: 999px;
              background-color: ${activityConfig[type].color}20;
              color: ${activityConfig[type].color};
            "
          >
            ${activityConfig[type].name}
          </span>
        `).join('')}
      </div>
    `;
    
    // Add click handler to content
    content.addEventListener('click', () => {
      setSelectedLocation(hoveredLocation);
      trackMarkerClick(hoveredLocation.name);
    });
    
    // Set InfoWindow options and position
    infoWindowRef.current.setContent(content);
    infoWindowRef.current.setPosition(hoveredLocation.coordinates);
    
    // Add class to detect and style infowindow container element
    const openInfoWindow = () => {
      infoWindowRef.current?.open(map);
      
      // Apply styles to the InfoWindow container after it's added to DOM
      setTimeout(() => {
        // Target the container div
        const container = document.querySelector('.gm-style-iw-c');
        if (container) {
          // Apply styles to completely remove padding and unwanted UI elements
          (container as HTMLElement).style.padding = '0';
          (container as HTMLElement).style.boxShadow = 'none';
          (container as HTMLElement).style.backgroundColor = 'transparent';
          (container as HTMLElement).style.borderRadius = '8px';
          (container as HTMLElement).style.maxWidth = 'none'; // Remove max-width constraint
          (container as HTMLElement).style.maxHeight = 'none'; // Remove max-height constraint
          (container as HTMLElement).style.zIndex = getComputedStyle(document.documentElement).getPropertyValue('--z-marker-infowindow').trim();
          
          // Forcefully hide the close button
          const closeButtons = document.querySelectorAll('.gm-ui-hover-effect, .gm-style-iw-d + button');
          closeButtons.forEach(button => {
            (button as HTMLElement).style.display = 'none';
            (button as HTMLElement).style.visibility = 'hidden';
            (button as HTMLElement).style.opacity = '0';
            (button as HTMLElement).style.pointerEvents = 'none';
          });
          
          // Remove the bottom tail/arrow
          const tail = document.querySelector('.gm-style-iw-t::after');
          if (tail) {
            (tail as HTMLElement).style.display = 'none';
          }
          
          // Fix inner container padding and constraints
          const innerContainer = document.querySelector('.gm-style-iw-d');
          if (innerContainer) {
            (innerContainer as HTMLElement).style.overflow = 'visible';
            (innerContainer as HTMLElement).style.padding = '0';
            (innerContainer as HTMLElement).style.maxWidth = 'none';
            (innerContainer as HTMLElement).style.maxHeight = 'none';
            (innerContainer as HTMLElement).style.zIndex = getComputedStyle(document.documentElement).getPropertyValue('--z-marker-infowindow-content').trim();
          }
          
          // Force the parent element to have no padding
          const iwBackground = document.querySelector('.gm-style-iw');
          if (iwBackground) {
            (iwBackground as HTMLElement).style.padding = '0';
            (iwBackground as HTMLElement).style.overflow = 'visible';
          }
        }
      }, 0);
    };
    
    // Open the InfoWindow
    openInfoWindow();
    
    // Clean up when component unmounts or hoveredLocation changes
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [hoveredLocation, map, maps, selectedLocation, isMobile, getZIndexValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // For search, only close if click is outside AND not on a search result
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Check if the click was on a search result item
        const clickedOnSearchResult = (event.target as Element)?.closest('[data-search-result]');
        if (!clickedOnSearchResult) {
          setSearchExpanded(false);
        }
      }
      
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(event.target as Node)) {
        setIsAgeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchExpanded, setIsAgeDropdownOpen]);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    // Debounce search for better performance
    const debounceTimeout = setTimeout(() => {
      // Use our enhanced search function that understands activities and ages
      const results = performEnhancedSearch(locations, searchTerm, activityConfig);
      
      // Limit to first 10 results for better performance
      setSearchResults(results.slice(0, 10));
      
      // Track the search query and results (only if search term is valid)
      if (searchTerm.trim().length > 1) {
        trackSearchQuery(
          searchTerm,
          results.length,
          activeFilters.length > 0,
          selectedAge !== null
        );
      }
      
      // Debug logging only when explicitly enabled via localStorage
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('enableSearchDebug') === 'true') {
        console.groupCollapsed(`Enhanced search for: "${searchTerm}"`);
        console.log(`Found ${results.length} results`);
        if (results.length > 0) {
          console.table(results.map(r => ({
            name: r.location.name,
            matchField: r.matchField,
            matchType: r.matchType,
            priority: r.priority,
            ageMatch: r.ageMatch,
            activityMatch: r.activityMatch
          })));
        }
        console.groupEnd();
      }
    }, 150); // 150ms debounce
    
    return () => clearTimeout(debounceTimeout);
  // activityConfig is defined at the module level and won't change between renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, locations]);

  // Get marker icon based on location's primary type or first type in the array
  const getMarkerIcon = useCallback((location: Location) => {
    // Use primary type if available, otherwise use first type in the array
    const displayType = location.primaryType || location.types[0];
    return {
      fillColor: activityConfig[displayType].color,
      fillOpacity: 1,
      path: 'M-6,0 C-6,-6 6,-6 6,0 C6,6 0,12 0,12 C0,12 -6,6 -6,0 Z',
      scale: 1.5,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    };
  }, []);

  const getUserLocationIcon = useCallback(() => {
    if (!maps) return undefined;
    
    return {
      path: maps.SymbolPath.CIRCLE,
      scale: 10, // Smaller than location markers (which use scale 1.5 with custom path)
      fillColor: '#4285F4',
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    };
  }, [maps]);

  const toggleFilter = (type: ActivityType) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setSelectedAge(null);
    setOpenNowFilter(false);
  };
  // Handle search select
  const handleSearchSelect = (location: Location, index: number = 0) => {
    console.log('Search item selected:', location.name);
    setSelectedLocation(location);
    setSearchExpanded(false);
    
    // Track search result click before clearing the search term
    if (searchTerm) {
      trackSearchResultClick(searchTerm, location.name, index);
    }
    
    // Clear search term after tracking
    setSearchTerm('');
    
    // Track the marker click for analytics, same as direct marker clicks
    trackMarkerClick(location.name);
    
    if (map) {
      // On mobile, ensure the drawer opens and map pans correctly
      if (isMobile) {
        // First do a simple pan to the location
        map.panTo(location.coordinates);
        
        // Set drawer state to partial by default
        setDrawerState('partial');
        
        // Keep setDrawerOpen for backward compatibility
        setDrawerOpen(true);
        
        // Use enhanced centering with a slight delay to ensure proper positioning
        setTimeout(() => {
          // Pass 'marker-selection' context to position the marker above the drawer
          centerMapOnLocation(location.coordinates, 'marker-selection');
        }, 50);
      } else {
        // On desktop, simply pan to the location
        map.panTo(location.coordinates);
      }
    }
  };

  // Debug helper for search results - only enabled when explicitly turned on
  useEffect(() => {
    if (searchResults.length > 0 && process.env.NODE_ENV === 'development' && localStorage.getItem('enableSearchDebug') === 'true') {
      console.log(`Search results updated: ${searchResults.length} items found`);
      console.log('Search expanded:', searchExpanded);
      console.log('Is mobile:', isMobile);
    }
  }, [searchResults, searchExpanded, isMobile]);

  const handleAgeSelect = (age: number | null) => {
    setSelectedAge(age);
    setIsAgeDropdownOpen(false);
  };

  // Reference to track if map has been initialized
  const mapInitializedRef = useRef(false);
  
  const onMapLoad = useCallback((map: google.maps.Map) => {
    // Skip if map has already been initialized
    if (mapInitializedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed('Map initialization - skipped');
        console.log('Map was already initialized');
        console.groupEnd();
      }
      return;
    }
    
    // Mark as initialized
    mapInitializedRef.current = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed('Map initialization');
      console.log('Map loaded successfully');
      console.log('Direct Google API calls disabled - using cached data only');
      console.groupEnd();
    }
    
    setMap(map);
    
    // Store maps reference but with a warning about direct API calls
    if (window.google?.maps) {
      console.log('Maps API reference stored, but direct API calls are disabled');
      setMaps(window.google.maps);
    }
    
    // Center on user location - this only happens if mapReady is true,
    // which means we've already determined the location
    if (userLocation.lat && userLocation.lng) {
      // Use the enhanced centering function with 'initial-load' context
      centerMapOnLocation(userLocation, 'initial-load');
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed('Initial map centering');
        console.log('Coordinates:', userLocation);
        console.groupEnd();
      }
    }
    
    map.addListener('click', () => {
      // On mobile, clicking the map should close the drawer completely
      if (isMobile) {
        setSelectedLocation(null);
        setDrawerOpen(false);
      } else {
        // On desktop, just deselect the location
        setSelectedLocation(null);
      }
      setHoveredLocation(null);
    });

    // Add listener for bounds_changed to update visible locations
    map.addListener('bounds_changed', () => {
      const bounds = map.getBounds();
      if (bounds) {
        // Filter locations to those within current bounds
        const locationsInView = locations.filter(location => {
          return bounds.contains(location.coordinates);
        });
        setVisibleLocations(locationsInView);
      }
    });
    
    // Force a bounds_changed event after initialization to populate visible locations
    setTimeout(() => {
      // Using setTimeout to ensure the map is fully rendered
      map.setZoom(map.getZoom()!); // This triggers bounds_changed without changing the view
    }, 300);
  }, [locations, isMobile, setDrawerOpen, setSelectedLocation, setHoveredLocation, setVisibleLocations, userLocation, centerMapOnLocation]);

  // Handle drawer close action 
  const handleDrawerClose = useCallback(() => {
    if (isMobile) {
      // On mobile: Always close the drawer completely regardless of current state
      setSelectedLocation(null);
      setDrawerState('closed');
      // Keep setDrawerOpen for backward compatibility
      setDrawerOpen(false);
    } else {
      // On desktop, just deselect the location
      setSelectedLocation(null);
    }
  }, [isMobile, setDrawerState, setDrawerOpen, setSelectedLocation]);

  // Handle location selection from tile or marker
  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocation(location);
    trackMarkerClick(location.name);
    
    // Only pan to the location on mobile view
    if (map && isMobile) {
      // Simple initial pan to the location
      map.panTo(location.coordinates);
      
      // Use enhanced centering with a slight delay to ensure marker click is processed
      setTimeout(() => {
        // Pass 'marker-selection' context to position the marker above the drawer
        centerMapOnLocation(location.coordinates, 'marker-selection');
      }, 20);
    }
  }, [map, isMobile, setSelectedLocation, centerMapOnLocation]);

  const ageOptions = Array.from({ length: 19 }, (_, i) => i);

  // Render search results dropdown outside the map container
  const renderSearchDropdown = () => {
    if (!searchExpanded || searchResults.length === 0) return null;
    
    // Get position for dropdown from the search reference
    const searchRect = searchRef.current?.getBoundingClientRect();
    if (!searchRect) return null;
    
    // Calculate position
    const dropdownTop = searchRect.bottom + window.scrollY;
    
    // For both mobile and desktop, align the dropdown's left edge with the input's left edge
    const dropdownLeft = searchRect.left + window.scrollX;
    
    // Determine width - use input width on mobile, and wider width for desktop
    const dropdownWidth = isMobile
      ? `${searchRect.width}px`
      : `${Math.min(Math.max(searchRect.width * 2, 350), 600)}px`; // min 350px, max 600px, approx twice as wide on desktop
    
    return (
      <div
        className="fixed bg-white rounded-lg shadow-lg overflow-y-auto z-search-dropdown"
        style={{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          width: dropdownWidth,
          maxHeight: '300px',
          zIndex: 2000, // High z-index to ensure visibility
        }}
      >
        {searchResults.map((result, index) => (
          <button
            key={`${result.location.id}-${result.matchField}-${index}`}
            onClick={() => handleSearchSelect(result.location, index)}
            data-search-result="true"
            className="w-full py-2 px-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex flex-col"
          >
            {/* Location name is always shown as the primary text */}
            <div className="font-medium text-gray-900 mb-1">{result.location.name}</div>
            
            {/* Activity type badges */}
            <div className="flex flex-wrap gap-1 mb-1">
              {/* Show only first 3 types on mobile to save space */}
              {result.location.types.slice(0, isMobile ? 2 : 3).map(type => (
                <span
                  key={type}
                  className="inline-block px-1.5 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: activityConfig[type].color + '20',
                    color: activityConfig[type].color,
                    // Highlight activity types that matched the search query
                    border: result.activityMatch &&
                           result.matchField === 'activityType' &&
                           result.location.types.includes(type) ?
                           `1px solid ${activityConfig[type].color}` : 'none'
                  }}
                >
                  {activityConfig[type].name}
                </span>
              ))}
              {/* Show indicator for additional types if there are more than shown */}
              {result.location.types.length > (isMobile ? 2 : 3) && (
                <span className="inline-block px-1.5 py-0.5 text-xs font-medium text-gray-500">
                  +{result.location.types.length - (isMobile ? 2 : 3)} more
                </span>
              )}
            </div>
            
            {/* Location address */}
            <div className="text-xs text-gray-600 truncate flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {result.location.address}
            </div>
            
            {/* Enhanced match information - show why this result matched */}
            <div className="flex flex-wrap mt-1 gap-x-2">
              {/* Show match reason */}
              {result.matchField === 'name' && (
                <div className="text-xs text-green-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Name match
                </div>
              )}
              
              {result.matchField === 'activityType' && (
                <div className="text-xs text-purple-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="22" y1="12" x2="18" y2="12"></line>
                    <line x1="6" y1="12" x2="2" y2="12"></line>
                    <line x1="12" y1="6" x2="12" y2="2"></line>
                    <line x1="12" y1="22" x2="12" y2="18"></line>
                  </svg>
                  Activity: {result.matchText}
                </div>
              )}
              
              {result.matchField === 'ageRange' && (
                <div className="text-xs text-orange-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  {result.matchText}
                </div>
              )}
              
              {result.matchField === 'description' && (
                <div className="text-xs text-blue-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Matched description
                </div>
              )}
              
              {result.matchField === 'address' && (
                <div className="text-xs text-blue-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Matched address
                </div>
              )}
              
              {/* Show age match indicator if matched by age and not already showing age match field */}
              {result.ageMatch && result.matchField !== 'ageRange' && (
                <div className="text-xs text-orange-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                  Ages {result.location.ageRange.min}-{result.location.ageRange.max}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };
  
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Add loading overlay */}
      {isLoadingLocations && (
        <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-700">Loading locations...</p>
          </div>
        </div>
      )}
      
      {/* Add error message */}
      {loadError && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-600 p-4 rounded-lg shadow-lg z-50">
          <p>{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      <div className={`bg-white p-2 overflow-x-auto shadow-sm z-filter-bar ${isMobile ? 'fixed top-16 left-0 right-0 w-full' : 'relative'}`}>
        <div className="flex items-center gap-2">
          {/* Search Component */}
          <div ref={searchRef} className="relative z-search-container">
            <div className={`flex items-center transition-all duration-200 ${
              searchExpanded ? 'w-64' : 'w-10'
            }`}>
              <button
                onClick={() => setSearchExpanded(!searchExpanded)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <Search size={20} className="text-gray-600" />
              </button>
              
              {searchExpanded && (
                <div className="flex-1 ml-2">
                  <input
                    type="text"
                    placeholder="Search by name, activity, age (e.g. 'swimming for 6 year old')..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-gray-200"></div>

          {/* Activity Filters */}
          <div className="flex gap-2 snap-x snap-mandatory overflow-x-auto">
            {Object.entries(activityConfig).map(([type, config]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type as ActivityType)}
                style={{
                  backgroundColor: activeFilters.includes(type as ActivityType)
                    ? config.color
                    : 'rgb(243 244 246)',
                  color: activeFilters.includes(type as ActivityType)
                    ? 'white'
                    : 'rgb(55 65 81)',
                  borderWidth: '1.5px',
                  borderColor: config.color,
                }}
                className="snap-start flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-90"
              >
                {config.name}
              </button>
            ))}

            {/* Age Filter */}
            <div ref={ageDropdownRef} className="relative">
              <button
                onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${selectedAge !== null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {selectedAge !== null ? `Age ${selectedAge}` : 'Age'}
                <ChevronDown size={16} className={`transform transition-transform ${isAgeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAgeDropdownOpen && (
                <div className="fixed mt-1 bg-white rounded-lg shadow-lg py-2 w-32 max-h-60 overflow-y-auto z-age-dropdown" style={{
                  top: ageDropdownRef.current?.getBoundingClientRect().bottom,
                  left: ageDropdownRef.current?.getBoundingClientRect().left
                }}>
                  <button
                    onClick={() => handleAgeSelect(null)}
                    className={`w-full px-4 py-1.5 text-left text-sm hover:bg-gray-50 ${selectedAge === null ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    Any Age
                  </button>
                  {ageOptions.map(age => (
                    <button
                      key={age}
                      onClick={() => handleAgeSelect(age)}
                      className={`w-full px-4 py-1.5 text-left text-sm hover:bg-gray-50 ${selectedAge === age ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      Age {age}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Open Now Filter */}
            <button
              onClick={() => setOpenNowFilter(!openNowFilter)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${openNowFilter
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Open Now
            </button>

            {/* Clear Filters - visible only on desktop when filters are active */}
            {!isMobile && (activeFilters.length > 0 || selectedAge !== null || openNowFilter) && (
              <button
                onClick={clearFilters}
                className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only floating Clear All button */}
      {isMobile && (activeFilters.length > 0 || selectedAge !== null || openNowFilter) && (
        <button
          onClick={clearFilters}
          className="fixed z-mobile-button bg-white bg-opacity-75 shadow-sm border border-gray-200 rounded-full px-3 py-1.5 text-xs font-medium text-red-600 flex items-center gap-1"
          style={{
            top: '120px', // Increased position to ensure it's below filter bar (header 64px + filter bar 42px)
            left: '8px', // Align to the left with some padding
            transition: 'opacity 0.2s ease-in-out'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Clear Filters
        </button>
      )}
      
      {/* Map */}
      <LoadScriptNext
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
        onError={(error) => {
          console.error('Google Maps loading error:', error);
          // Check if error might be related to API key
          if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY === '') {
            alert('Google Maps API key is missing or invalid. Please check your .env file.');
          }
        }}
        libraries={GOOGLE_MAPS_LIBRARIES}
      >
        <div className="relative flex-1 flex">
          {/* Map Blocking Overlay - only shows when drawer is open on mobile */}
          <MapBlockingOverlay />

        {/* Enhanced loading overlay */}
        {!mapReady && (
          <div
            style={{
              position: 'absolute',
              top: isMobile ? '84px' : 0,
              left: !isMobile ? '533px' : 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50, // Above map but below other UI elements
              transition: 'opacity 0.3s ease-in-out'
            }}
          >
            <div className="flex flex-col items-center text-center px-4">
              <div className="relative mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 w-16 h-16">
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">Finding your location...</p>
                <p className="text-gray-500 text-sm">We're preparing your map experience</p>
              </div>
            </div>
          </div>
        )}
        
        <GoogleMap
            mapContainerStyle={{
              width: !isMobile ? `calc(100% - 533px)` : '100%', // Explicitly set width on desktop
              height: '100%',
              position: 'absolute',
              top: isMobile ? '84px' : 0, // Add padding for header (64px) + filter bar (20px) on mobile
              left: !isMobile ? '533px' : 0, // Position after drawer on desktop
              right: 0,
              bottom: 0,
              opacity: mapReady ? 1 : 0, // Completely hide map until fully ready
              transition: 'opacity 0.5s ease-in-out',
              pointerEvents: (mapReady && !isMapBlocked) ? 'auto' : 'none', // Prevent interaction when blocked
              touchAction: isMapBlocked ? 'none' : 'auto' // Prevent touch actions when blocked
            }}
            mapContainerClassName={isMapBlocked ? 'map-blocked' : ''}
            // Don't set initial center here - we'll handle it in onLoad
            zoom={13}
            onLoad={onMapLoad}
            options={{
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                },
                {
                  featureType: "transit",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                }
              ],
              zoomControl: !isMobile, // Hide zoom controls on mobile
              mapTypeControl: false,
              scaleControl: true,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: false,
              clickableIcons: false, // Prevent clicks on POIs for better control
              // Critical change: Use isMapBlocked to fully prevent map interaction
              // This completely prevents map gestures when the drawer is showing
              gestureHandling: isMapBlocked ? 'none' : (isMobile ? 'greedy' : 'auto'),
              minZoom: 3, // Prevent zooming out too far
              maxZoom: 20, // Prevent excessive zoom
              disableDefaultUI: isMobile, // Hide all default UI on mobile
              // Additional touch handling improvements
              draggableCursor: 'grab',
              draggingCursor: 'grabbing',
              isFractionalZoomEnabled: false // Disable fractional zoom on mobile to prevent zoom issues
            }}
          >
            {/* Markers */}
            {useMemo(() => {
              // Memoize the filtered locations to avoid re-filtering on every render
              const filteredLocations = locations.filter(location => {
                if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
                  return false;
                }
                if (selectedAge !== null) {
                  if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
                    return false;
                  }
                }
                if (openNowFilter) {
                  const now = new Date();
                  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
                  const hours = location.openingHours[day];

                  if (!hours || hours === 'Closed' || hours === 'Hours not available') {
                    return false;
                  }
                  if (hours === 'Open 24 hours') {
                    return true;
                  }

                  try {
                    const timeParts = hours.split(/[–-]/).map(t => t.trim());
                    if (timeParts.length !== 2) return false;
                    const [start, end] = timeParts;
                    
                    const parseTime = (timeStr: string) => {
                      if (!timeStr) return 0;
                      const parts = timeStr.split(' ');
                      if (parts.length !== 2) return 0;
                      
                      const [time, period] = parts;
                      if (!time || !period) return 0;
                      
                      const [hours, minutes] = time.split(':').map(Number);
                      if (isNaN(hours)) return 0;
                      
                      let totalHours = hours;
                      if (period === 'PM' && hours !== 12) totalHours += 12;
                      if (period === 'AM' && hours === 12) totalHours = 0;
                      
                      return totalHours * 60 + (minutes || 0);
                    };

                    const startMinutes = parseTime(start);
                    const endMinutes = parseTime(end);
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();

                    if (endMinutes < startMinutes) {
                      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
                    }

                    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                  } catch (error) {
                    // Silent error in production
                    return false;
                  }
                }
                return true;
              });

              return filteredLocations.map(location => (
                <Marker
                  // Ensure we always have a valid, unique key - never empty string
                  key={`location-marker-${location.id || Math.random().toString(36).substring(2, 9)}`}
                  position={location.coordinates}
                  onClick={() => {
                    // Add a slight delay on mobile to allow map panning to complete first
                    if (isMobile) {
                      // On mobile, ensure the marker is centered first, then open drawer
                      setTimeout(() => {
                        handleLocationSelect(location);
                        // Set drawer state to partial by default
                        setDrawerState('partial');
                        // Keep setDrawerOpen for backward compatibility
                        setDrawerOpen(true);
                      }, 50);
                    } else {
                      // On desktop, open drawer immediately
                      handleLocationSelect(location);
                    }
                  }}
                  onMouseOver={() => {
                    // Allow hovering over any location, even if drawer is open
                    // Just don't show hover for the currently selected location
                    if (selectedLocation?.id !== location.id) {
                      setHoveredLocation(location);
                    }
                  }}
                  onMouseOut={() => {
                    if (hoveredLocation?.id === location.id) {
                      setHoveredLocation(null);
                    }
                  }}
                  options={{
                    zIndex: selectedLocation?.id === location.id
                      ? getZIndexValue('--z-marker-selected')
                      : getZIndexValue('--z-marker-normal')
                  }}
                  icon={{
                    ...getMarkerIcon(location),
                    scale: selectedLocation?.id === location.id ? 2 : 1.5
                  }}
              />
            ))}
            // Close the useMemo callback and dependencies array
            , [locations, activeFilters, selectedAge, openNowFilter, selectedLocation, hoveredLocation, getMarkerIcon, handleLocationSelect, isMobile, setDrawerOpen, setDrawerState, setHoveredLocation, getZIndexValue])}

            {/* User location marker */}
            {maps && (
              <Marker
                key="user-location-marker" // Add a unique key for user location marker
                position={userLocation}
                icon={getUserLocationIcon()}
                options={{
                  zIndex: getZIndexValue('--z-marker-normal') - 10 // Lower than location markers so it appears behind them
                }}
                title="Your current location" // Basic tooltip for non-touch devices
                onMouseOver={() => {
                  // Create and open an info window for the user's location
                  if (!map) return;
                  
                  // Close any existing InfoWindow for this marker
                  if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                  }
                  
                  // Create a new InfoWindow if it doesn't exist
                  if (!infoWindowRef.current) {
                    infoWindowRef.current = new maps.InfoWindow({
                      disableAutoPan: true,
                      pixelOffset: new maps.Size(0, -30),
                      maxWidth: 220
                    });
                  }
                  
                  // Custom content for user location tooltip
                  const content = document.createElement('div');
                  content.style.cssText = `
                    padding: 10px 14px;
                    margin: 0;
                    border-radius: 8px;
                    background-color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    min-width: 160px;
                    transform: translateY(-8px);
                  `;
                  
                  content.innerHTML = `
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                    ">
                      <div style="
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background-color: #4285F4;
                        border: 2px solid white;
                      "></div>
                      <p style="
                        font-size: 14px;
                        font-weight: 500;
                        color: #1f2937;
                        margin: 0;
                      ">Your current location</p>
                    </div>
                  `;
                  
                  // Set content and position
                  infoWindowRef.current.setContent(content);
                  infoWindowRef.current.setPosition(userLocation);
                  
                  // Open the InfoWindow
                  infoWindowRef.current.open(map);
                  
                  // Apply styles to InfoWindow container after it's added to DOM
                  setTimeout(() => {
                    // Target the container div
                    const container = document.querySelector('.gm-style-iw-c');
                    if (container) {
                      // Apply styles to completely remove padding and unwanted UI elements
                      (container as HTMLElement).style.padding = '0';
                      (container as HTMLElement).style.boxShadow = 'none';
                      (container as HTMLElement).style.backgroundColor = 'transparent';
                      (container as HTMLElement).style.borderRadius = '8px';
                      (container as HTMLElement).style.maxWidth = 'none';
                      (container as HTMLElement).style.maxHeight = 'none';
                      (container as HTMLElement).style.zIndex = getComputedStyle(document.documentElement).getPropertyValue('--z-marker-infowindow').trim();
                      
                      // Hide the close button
                      const closeButtons = document.querySelectorAll('.gm-ui-hover-effect, .gm-style-iw-d + button');
                      closeButtons.forEach(button => {
                        (button as HTMLElement).style.display = 'none';
                      });
                      
                      // Remove the bottom tail/arrow
                      const tail = document.querySelector('.gm-style-iw-t::after');
                      if (tail) {
                        (tail as HTMLElement).style.display = 'none';
                      }
                      
                      // Fix inner container padding
                      const innerContainer = document.querySelector('.gm-style-iw-d');
                      if (innerContainer) {
                        (innerContainer as HTMLElement).style.overflow = 'visible';
                        (innerContainer as HTMLElement).style.padding = '0';
                        (innerContainer as HTMLElement).style.zIndex = getComputedStyle(document.documentElement).getPropertyValue('--z-marker-infowindow-content').trim();
                      }
                    }
                  }, 0);
                }}
                onMouseOut={() => {
                  // Close the InfoWindow when mouse leaves
                  if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                  }
                }}
              />
            )}

            {/* Drawer Component */}
            <Drawer
              location={selectedLocation}
              onClose={handleDrawerClose}
              activityConfig={activityConfig}
              visibleLocations={visibleLocations}
              activeFilters={activeFilters}
              selectedAge={selectedAge}
              openNowFilter={openNowFilter}
              onLocationSelect={handleLocationSelect}
              mobileDrawerOpen={drawerState !== 'closed'}
              backToList={() => {
                // Transition to list view on mobile while preserving drawer state
                setSelectedLocation(null);
                
                // Ensure drawer state is preserved in TouchContext
                // When going back to list from detail, always keep the drawer visible
                if (drawerState === 'closed') {
                  // If drawer was somehow closed, set to partial
                  setDrawerState('partial');
                }
                // else keep current state (partial or full)
                
                // Update UIState for backward compatibility
                setDrawerOpen(true);
                
                console.log('Back to list: drawer state =', drawerState);
              }}
            />

            {/* Hover InfoWindow is handled via useEffect with infoWindowRef */}
            </GoogleMap>
          </div>
        </LoadScriptNext>
        
      {/* Mobile Drawer Floating Button - Shows when drawer is closed on mobile */}
      {isMobile && drawerState === 'closed' && (
        <button
          onClick={() => {
            setDrawerState('partial');
            // Update UIState for backward compatibility
            setDrawerOpen(true);
          }}
          className="fixed z-mobile-button bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-full bg-white hover:bg-gray-50 shadow-lg flex items-center gap-2 border border-gray-200"
          aria-label="Show locations"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}
      
      {/* Custom My Location Button */}
      {mapReady && (
        <div
          className="absolute z-mobile-button"
          style={{
            // Position calculation for mobile and desktop
            top: isMobile ? '132px' : '76px',  // Fixed positioning below the filter bar
            right: '15px',
            pointerEvents: 'auto'
          }}
        >
          <button
            onClick={() => {
              if (map && userLocation && userLocation.lat && userLocation.lng) {
                // Re-center the map on the user's location with appropriate context
                centerMapOnLocation(userLocation, 'initial-load');
                
                // Request fresh location data
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const freshLocation = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    };
                    setUserLocation(freshLocation);
                    centerMapOnLocation(freshLocation, 'initial-load');
                  },
                  (error) => {
                    console.log('Geolocation error when refreshing position:', error.message);
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                  }
                );
              }
            }}
            className="bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-150 flex items-center justify-center"
            style={{
              width: '40px',
              height: '40px',
            }}
            aria-label="Center on my location"
          >
            {/* Improved Google Maps-style "my location" bullseye icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
              {/* Bullseye with crosshairs design */}
              <circle cx="12" cy="12" r="8"></circle>
              <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
            </svg>
          </button>
        </div>
      )}
      
      {/* Render search dropdown outside map container */}
      {renderSearchDropdown()}
    </div>
  );
};

export default MapComponent;