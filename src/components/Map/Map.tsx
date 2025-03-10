import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, LoadScriptNext, Marker, Libraries } from '@react-google-maps/api';
import Drawer from './Drawer';
import { Location, ActivityType } from '../../data/locations';
import { Search, ChevronDown } from 'lucide-react';
import { trackMarkerClick } from '../../utils/analytics';
import { useMobile } from '../../contexts/MobileContext';
import { useUIState } from '../../contexts/UIStateContext';
import { useTouch } from '../../contexts/TouchContext';
import MapBlockingOverlay from './MapBlockingOverlay';

// Using MobileContext instead of local mobile detection

// Define libraries as a static constant to prevent recreating the array on each render
// This prevents the "LoadScript has been reloaded unintentionally" warning
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapProps {
  locations: Location[];
}

interface SearchResult {
  location: Location;
  matchField: string;
  matchText: string;
}

const activityConfig = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679' },
  'sports': { name: 'Sports', color: '#FF8C00' },
  'arts': { name: 'Arts', color: '#9C27B0' },
  'music': { name: 'Music', color: '#3F51B5' },
  'education': { name: 'Education', color: '#4285F4' },
  'entertainment': { name: 'Entertainment', color: '#FFB300' }
};

const MapComponent: React.FC<MapProps> = ({ locations }) => {
  // Use context hooks for mobile detection and UI state
  const { isMobile } = useMobile();
  // Get drawer state from TouchContext
  const { drawerState, setDrawerState } = useTouch();
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

  const searchRef = useRef<HTMLDivElement>(null);
  const ageDropdownRef = useRef<HTMLDivElement>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Using default Athens location');
        }
      );
    }
  }, []);
  
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
      const results: SearchResult[] = [];
      const searchLower = searchTerm.toLowerCase();
      const resultMap = new Map<string, boolean>(); // Track unique locations by ID

      locations.forEach(location => {
        // Skip if we already added this location
        if (resultMap.has(location.id)) return;
        
        if (location.name.toLowerCase().includes(searchLower)) {
          results.push({
            location,
            matchField: 'name',
            matchText: location.name
          });
          resultMap.set(location.id, true);
          return; // Skip checking other fields if name matches
        }
        
        if (location.description.toLowerCase().includes(searchLower)) {
          results.push({
            location,
            matchField: 'description',
            matchText: location.description
          });
          resultMap.set(location.id, true);
          return;
        }
        
        if (location.address.toLowerCase().includes(searchLower)) {
          results.push({
            location,
            matchField: 'address',
            matchText: location.address
          });
          resultMap.set(location.id, true);
        }
      });

      setSearchResults(results);
    }, 150); // 150ms debounce
    
    return () => clearTimeout(debounceTimeout);
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

  const handleSearchSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchExpanded(false);
    setSearchTerm('');
    if (map) {
      map.panTo(location.coordinates);
    }
  };

  const handleAgeSelect = (age: number | null) => {
    setSelectedAge(age);
    setIsAgeDropdownOpen(false);
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setMaps(window.google.maps);
    
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
  }, [locations, isMobile, setDrawerOpen, setSelectedLocation, setHoveredLocation, setVisibleLocations]);

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
      map.panTo(location.coordinates);
      
      // Mobile: Ensure marker is in good viewing position
      const bounds = map.getBounds();
      if (bounds) {
        const point = location.coordinates;
        const projection = map.getProjection();
        
        if (projection) {
          // Since we now show the drawer in full screen on mobile, adjust targeting
          // Convert marker position to pixels
          const mapHeight = map.getDiv().offsetHeight;
          
          // Convert marker position to pixels
          const pointPx = projection.fromLatLngToPoint(new google.maps.LatLng(point.lat, point.lng));
          const centerPx = projection.fromLatLngToPoint(map.getCenter()!);
          
          if (pointPx && centerPx) {
            const scale = Math.pow(2, map.getZoom() || 0);
            
            const markerScreenY = (pointPx.y - centerPx.y) * scale + mapHeight / 2;
            
            // Mobile: Position marker in the upper portion of the visible area
            // Target 20% from top since we'll have a fullscreen drawer
            const targetY = mapHeight * 0.2;
            const newCenterPx = new google.maps.Point(
              centerPx.x,
              centerPx.y + (markerScreenY - targetY) / scale
            );
            const newCenter = projection.fromPointToLatLng(newCenterPx);
            if (newCenter) {
              // Use a small delay to ensure marker click is processed before panning
              setTimeout(() => {
                map.panTo(newCenter);
              }, 20);
            }
          }
        }
      }
    }
  }, [map, isMobile, setSelectedLocation]);

  const ageOptions = Array.from({ length: 19 }, (_, i) => i);

  return (
    <div className="relative h-full w-full flex flex-col">
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
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="fixed mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto z-search-dropdown" style={{
                      top: searchRef.current?.getBoundingClientRect().bottom,
                      left: searchRef.current?.getBoundingClientRect().left,
                      width: searchRef.current?.getBoundingClientRect().width,
                      maxWidth: '350px'
                    }}>
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.location.id}-${result.matchField}-${index}`}
                          onClick={() => handleSearchSelect(result.location)}
                          data-search-result="true"
                          className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium">{result.location.name}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {result.matchText}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
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

            {/* Clear Filters */}
            {(activeFilters.length > 0 || selectedAge !== null || openNowFilter) && (
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

          <GoogleMap
            mapContainerStyle={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: isMobile ? '84px' : 0, // Add padding for header (64px) + filter bar (20px) on mobile
              left: 0,
              right: 0,
              bottom: 0,
              marginLeft: !isMobile ? '533px' : 0, // Add margin for drawer in desktop view
            }}
            center={userLocation}
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
              // Critical change: Always use 'none' when drawer is open on mobile
              // This completely prevents map gestures when the drawer is showing
              gestureHandling: isMobile && drawerState !== 'closed' ? 'none' : (isMobile ? 'greedy' : 'auto'),
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
                  key={location.id}
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
                // Keep current drawer state (partial or full)
                // Update UIState for backward compatibility
                setDrawerOpen(true);
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
    </div>
  );
};

export default MapComponent;