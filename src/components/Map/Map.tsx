import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, LoadScriptNext, Marker, Libraries } from '@react-google-maps/api';
import { useLocation } from 'react-router-dom';
import Drawer from './Drawer';
import { ActivityType, Location } from '../../types/location';
import { Search, ChevronDown } from 'lucide-react';
import { trackMarkerClick, trackSearchQuery, trackSearchResultClick } from '../../utils/analytics';
import { useMobile } from '../../contexts/MobileContext';
import { useTouch } from '../../contexts/TouchContext';
import { useAppState } from '../../contexts/AppStateContext';
import MapBlockingOverlay from './MapBlockingOverlay';
import GroupFilterDropdown from './GroupFilterDropdown';
import { getLocations } from '../../utils/firebase-service';
import { performEnhancedSearch, SearchMatch } from '../../utils/search-utils';
import { ACTIVITY_CATEGORIES, ACTIVITY_GROUPS } from '../../utils/metadata';

// Using MobileContext instead of local mobile detection

// Define libraries as a static constant to prevent recreating the array on each render
// This prevents the "LoadScript has been reloaded unintentionally" warning
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapProps {
  // No longer need locations as props, as we'll fetch them from Firebase
}

// Using our enhanced SearchMatch type from search-utils.ts
type SearchResult = SearchMatch;

// Use activity categories from centralized metadata
const activityConfig = ACTIVITY_CATEGORIES;

const MapComponent: React.FC<MapProps> = () => {
  // Get location for URL parameter access
  const location = useLocation();
  
  // Add state for locations, loading state, and error handling
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Use context hooks for mobile detection and UI state
  const { isMobile } = useMobile();
  // Get drawer state and map blocking state from TouchContext
  const { drawerState, setDrawerState, isMapBlocked, setLocationClearCallback, setFilterDropdownOpen } = useTouch();
  
  // Get app state signals from AppStateContext
  const { setLocationsLoading, setLocationsLoaded, setLocationsProcessed, setMapReady, shouldOpenDrawer } = useAppState();
  
  // Add effect to log drawer state changes for debugging
  
  // Add effect to log drawer state changes for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Drawer state changed to: ${drawerState}`);
    }
  }, [drawerState]);
  
  // No synchronization needed as we're now only using TouchContext

  // Helper function to safely get z-index from CSS variables
  const getZIndexValue = useCallback((variableName: string): number => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
    return parseInt(value.trim()) || 0; // fallback to 0 if parsing fails
  }, []);
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActivityType[]>([]);
  const [activeGroups, setActiveGroups] = useState<string[]>([]);
  const [freeActivitiesFilter, setFreeActivitiesFilter] = useState(false);
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
  const [mapReadyState, setMapReadyState] = useState(false);
  // This ref was removed as we simplified the map initialization logic

  const searchRef = useRef<HTMLDivElement>(null);
  const ageDropdownRef = useRef<HTMLDivElement>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const drawerInitializedRef = useRef<boolean>(false);
  // Add a ref to track when initial loading is complete (to allow drawer updates during map panning)
  const initializationCompleteRef = useRef<boolean>(false);
  
  // Add refs to track validation timing and update sources
  const lastValidationTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  const lastUpdateSourceRef = useRef<string>('');
  const lastValidationResultRef = useRef<'valid' | 'invalid' | 'fixed' | ''>('');

  // Utility function to filter locations based on all active filters
  const filterLocations = useCallback((locationsToFilter: Location[]) => {
    return locationsToFilter.filter(location => {
      // Filter by activity type
      if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
        return false;
      }
      
      // Filter by age
      if (selectedAge !== null) {
        if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
          return false;
        }
      }
      
      // Filter by price (free activities)
      if (freeActivitiesFilter && location.priceRange !== "Free") {
        return false;
      }
      
      // Filter by open now
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
      
      // If location passes all active filters, include it
      return true;
    });
  }, [activeFilters, selectedAge, freeActivitiesFilter, openNowFilter]);

  // This function has been removed as we now use a simpler approach for map positioning
  
  // Register callback to clear selected location when drawer is closed by gestures
  useEffect(() => {
    setLocationClearCallback(() => {
      // Only clear marker selection if map is already initialized
      // and there's an active selection to clear
      if (mapReadyState && selectedLocation) {
        console.log('Clearing marker selection due to drawer gesture close');
        setSelectedLocation(null);
        setHoveredLocation(null);
        
        // Don't set drawerInitializedRef to true here - we want to allow reopening
        // This helps prevent issues where drawer can't be reopened
        console.log('Drawer closed by gesture - allowing future reopening');
      }
    });
  }, [setLocationClearCallback, setSelectedLocation, setHoveredLocation, mapReadyState, selectedLocation]);
  
  // Enhanced drawer initialization - respects AppStateContext but defers to TouchContext
  useEffect(() => {
    // Only run this effect when shouldOpenDrawer changes to true
    if (shouldOpenDrawer && isMobile) {
      // We no longer directly set drawer state here
      // This prevents multiple components trying to control the drawer during initialization
      // TouchContext is now the single source of truth for drawer initialization
      console.log('Map detected initialization signal, deferring to TouchContext for drawer handling');
      
      // Still mark as initialized in the Map component
      drawerInitializedRef.current = true;
    }
  }, [shouldOpenDrawer, isMobile]);

  // We no longer close the drawer based on visible locations
  // since we now always show the 10 closest locations even if not in viewport
  
  // Removed fallback location logic - no longer needed
  // The drawer should now accurately reflect map state, even when there are no visible locations
  
  // Process URL parameters for filtering
  useEffect(() => {
    // Get filter parameters
    const queryParams = new URLSearchParams(location.search);
    
    // Clear existing filters first
    setActiveFilters([]);
    setActiveGroups([]);
    setFreeActivitiesFilter(false);
    setSelectedAge(null);
    setOpenNowFilter(false);
    
    // Process activity group filter or free activities filter
    const filterParam = queryParams.get('filter');
    if (filterParam) {
      if (filterParam === 'free-activities') {
        // Handle special case for free activities
        console.log('Applying free activities filter from URL');
        setFreeActivitiesFilter(true);
      } else if (Object.keys(ACTIVITY_GROUPS).includes(filterParam)) {
        // If the filter parameter matches an activity group, apply that filter
        console.log(`Applying group filter from URL: ${filterParam}`);
        
        // Set the new filter group
        const group = ACTIVITY_GROUPS[filterParam];
        setActiveGroups([filterParam]);
        
        // Add all types from this group to active filters
        const typesInGroup = group.types as ActivityType[];
        setActiveFilters(typesInGroup);
      }
    }
    
    // Process price filter (alternative to free-activities)
    const priceParam = queryParams.get('price');
    if (priceParam === 'Free') {
      console.log('Applying price=Free filter from URL');
      setFreeActivitiesFilter(true);
    }
    
    // Process age filter
    const ageParam = queryParams.get('age');
    if (ageParam && !isNaN(parseInt(ageParam))) {
      const age = parseInt(ageParam);
      console.log(`Applying age filter from URL: ${age}`);
      setSelectedAge(age);
    }
    
    // Process open now filter
    const openNowParam = queryParams.get('open');
    if (openNowParam === 'true') {
      console.log('Applying open now filter from URL');
      setOpenNowFilter(true);
    }
    
    // Log all applied filters
    if (process.env.NODE_ENV === 'development') {
      const appliedFilters = [];
      if (filterParam) appliedFilters.push(`filter=${filterParam}`);
      if (priceParam) appliedFilters.push(`price=${priceParam}`);
      if (ageParam) appliedFilters.push(`age=${ageParam}`);
      if (openNowParam) appliedFilters.push(`open=${openNowParam}`);
      
      if (appliedFilters.length > 0) {
        console.log('Applied URL filters:', appliedFilters.join(', '));
      } else {
        console.log('No URL filters applied');
      }
    }
  }, [location.search]);
  
  // Add dedicated effect to handle filter changes
  useEffect(() => {
    // Skip during initial render or if no map is available yet
    if (!map || !mapReadyState || locations.length === 0) return;
    
    // Log the filter change with clearer formatting
    console.log(`🔍 FILTER CHANGE DETECTED - activeFilters: ${activeFilters.length}, age: ${selectedAge}, openNow: ${openNowFilter}, freeActivities: ${freeActivitiesFilter}`);
    
    // Reset the debounce timer to ensure validation runs after this update
    lastValidationTimeRef.current = 0;
    
    // Force cancel any pending updates
    pendingUpdateRef.current = false;
    
    // Mark this as a high-priority filter-based update
    lastUpdateSourceRef.current = 'filter_change';
    
    // Apply all active filters to get the filtered locations
    const filteredLocations = filterLocations(locations);
    console.log(`Filter change: ${locations.length} locations filtered to ${filteredLocations.length} matching current filters`);
    
    // CRITICAL: If we have fewer than 15 filtered locations, use them ALL
    // This is the key change to prevent the drawer showing incorrect locations
    let closestLocations: Location[] = [];
    
    // Get the current map center for distance calculation
    const mapCenter = map.getCenter();
    if (mapCenter) {
      const mapCenterPosition = {
        lat: mapCenter.lat(),
        lng: mapCenter.lng()
      };
      
      // Calculate distance for filtered locations from the current map center
      const locationsWithDistance = filteredLocations.map(location => {
        const distance = Math.sqrt(
          Math.pow(location.coordinates.lat - mapCenterPosition.lat, 2) +
          Math.pow(location.coordinates.lng - mapCenterPosition.lng, 2)
        );
        return { location, distance };
      });
      
      // Sort by distance (closest first)
      locationsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // If we have very few filtered locations (< 15), use all of them
      // This ensures we don't mix filtered and unfiltered locations
      if (filteredLocations.length < 15) {
        console.log(`🔍 Using ALL ${filteredLocations.length} filtered locations instead of limiting to 15`);
        closestLocations = filteredLocations;
      } else {
        // We have plenty of filtered locations, take the closest 15
        closestLocations = locationsWithDistance
          .map(item => item.location)
          .slice(0, 15);
      }
    } else {
      // No map center available, just use all filtered locations (up to 15)
      closestLocations = filteredLocations.slice(0, Math.min(filteredLocations.length, 15));
    }
    
    // Log what we're about to set
    console.log(`🔍 Setting visibleLocations to ${closestLocations.length} locations from filter_change`);
    
    // Directly set visible locations with a small delay to ensure it takes effect
    // This helps avoid race conditions with other effects
    setTimeout(() => {
      setVisibleLocations(closestLocations);
      
      // Set a flag to indicate that visible locations should not be overwritten
      // by other effects for a short period
      pendingUpdateRef.current = true;
      
      // Reset validation result to force a fresh validation after update
      lastValidationResultRef.current = '';
      
      // Clear pending update flag after a reasonable delay
      setTimeout(() => {
        pendingUpdateRef.current = false;
        
        // Force a validation run after updating is complete
        console.log(`🔍 Filter update complete - forcing validation`);
        lastValidationTimeRef.current = 0;
      }, 100);
    }, 0);
    
  }, [activeFilters, selectedAge, openNowFilter, freeActivitiesFilter, map, mapReadyState, locations, filterLocations]);
  
  // Fetch locations from Firebase on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      setLoadError(null);
      // Signal to AppStateContext that we're loading locations
      setLocationsLoading();
      try {
        // Try to get locations from the session storage cache first
        const cachedLocations = sessionStorage.getItem('cachedLocations');
        if (cachedLocations) {
          console.log('Using cached locations data');
          const parsedLocations = JSON.parse(cachedLocations);
          setLocations(parsedLocations);
          
          // IMPROVED APPROACH: Filter cached locations before selecting closest ones
          // Apply all active filters to entire locations dataset (same as non-cached logic)
          const filteredLocations = parsedLocations.filter((location: Location) => {
            // Filter by activity type
            if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
              return false;
            }
            
            // Filter by age
            if (selectedAge !== null) {
              if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
                return false;
              }
            }
            
            // Filter by price (free activities)
            if (freeActivitiesFilter && location.priceRange !== "Free") {
              return false;
            }
            
            // Filter by open now
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
                return false;
              }
            }
            
            return true;
          });
          
          console.log(`Filtered ${parsedLocations.length} cached locations down to ${filteredLocations.length} matching current filters`);
          
          // Immediately populate visibleLocations with filtered locations on desktop
          // DO NOT populate visibleLocations during initial load when there are active filters
          // This prevents overriding the filtered results that will be calculated in the filter change effect
          if (activeFilters.length > 0 || selectedAge !== null || openNowFilter || freeActivitiesFilter) {
            console.log('🔍 LOCATION SOURCE 1: Skipping pre-population because filters are active');
            // Don't set visibleLocations here - let the filter change effect handle it
          } else {
          // Simplify and unify location source for both mobile and desktop
          // This avoids having different loading paths for mobile vs desktop
          console.log('🔍 LOCATION SOURCE 1: Pre-populating filtered visibleLocations for drawer (no active filters)');
          setVisibleLocations(filteredLocations.slice(0, 15));
          }
          
          setIsLoadingLocations(false);
          
          // Signal both locations loaded and processed
          setLocationsLoaded();
          // Small delay to ensure UI updates before processing signal
          setTimeout(() => {
            setLocationsProcessed();
          }, 50);
          
          // Fetch fresh data in the background to update the cache
          getLocations().then(freshLocations => {
            sessionStorage.setItem('cachedLocations', JSON.stringify(freshLocations));
            setLocations(freshLocations);
            
            // Update visibleLocations with fresh data
            if (!isMobile) {
              setVisibleLocations(freshLocations.slice(0, 15));
            } else {
              // Update mobile locations too
              const defaultCoords = { lat: 37.9838, lng: 23.7275 };
              const locationsWithDistance = freshLocations.map((location: Location) => {
                const distance = Math.sqrt(
                  Math.pow(location.coordinates.lat - defaultCoords.lat, 2) +
                  Math.pow(location.coordinates.lng - defaultCoords.lng, 2)
                );
                return { location, distance };
              });
              locationsWithDistance.sort((a: {location: Location, distance: number}, b: {location: Location, distance: number}) =>
                a.distance - b.distance
              );
              const closestLocations = locationsWithDistance
                .map((item: {location: Location, distance: number}) => item.location)
                .slice(0, 15);
              setVisibleLocations(closestLocations);
            }
          }).catch(console.error);
          
          return;
        }
        
        // If no cache, fetch from Firebase
        const fetchedLocations = await getLocations();
        setLocations(fetchedLocations);
        
        // Signal locations are loaded (but not yet processed)
        setLocationsLoaded();
        
        // IMPROVED APPROACH: Filter locations before selecting closest ones
        // 1. Apply all active filters to entire locations dataset
        // Note: filterLocations isn't available yet since it's defined by useCallback
        // So we'll inline the filtering logic here
        const filteredLocations = fetchedLocations.filter(location => {
          // Filter by activity type
          if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
            return false;
          }
          
          // Filter by age
          if (selectedAge !== null) {
            if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
              return false;
            }
          }
          
          // Filter by price (free activities)
          if (freeActivitiesFilter && location.priceRange !== "Free") {
            return false;
          }
          
          // Filter by open now
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
              return false;
            }
          }
          
          return true;
        });
        
        console.log(`Filtered ${fetchedLocations.length} locations down to ${filteredLocations.length} matching current filters`);
        
        // Populate visibleLocations for both desktop and mobile
        if (!isMobile) {
          console.log('Pre-populating filtered visibleLocations for desktop drawer');
          setVisibleLocations(filteredLocations.slice(0, 15));
        } else {
          // For mobile, populate with closest FILTERED locations to default center
          console.log('Pre-populating filtered visibleLocations for mobile');
          const defaultCoords = { lat: 37.9838, lng: 23.7275 };
          const locationsWithDistance = filteredLocations.map((location: Location) => {
            const distance = Math.sqrt(
              Math.pow(location.coordinates.lat - defaultCoords.lat, 2) +
              Math.pow(location.coordinates.lng - defaultCoords.lng, 2)
            );
            return { location, distance };
          });
          locationsWithDistance.sort((a: {location: Location, distance: number}, b: {location: Location, distance: number}) =>
            a.distance - b.distance
          );
          const closestLocations = locationsWithDistance
            .map((item: {location: Location, distance: number}) => item.location)
            .slice(0, 15);
          setVisibleLocations(closestLocations);
        }
        
        // Cache the locations in session storage
        sessionStorage.setItem('cachedLocations', JSON.stringify(fetchedLocations));
        
        // First ensure visibleLocations are populated BEFORE signaling processed
        if (visibleLocations.length === 0) {
          console.log('🚀 Pre-populating visibleLocations before locations-processed signal');
          // For mobile, populate with closest locations to default center
          const defaultCoords = { lat: 37.9838, lng: 23.7275 };
          const locationsWithDistance = fetchedLocations.map((location: Location) => {
            const distance = Math.sqrt(
              Math.pow(location.coordinates.lat - defaultCoords.lat, 2) +
              Math.pow(location.coordinates.lng - defaultCoords.lng, 2)
            );
            return { location, distance };
          });
          locationsWithDistance.sort((a: {location: Location, distance: number}, b: {location: Location, distance: number}) =>
            a.distance - b.distance
          );
          const closestLocations = locationsWithDistance
            .map((item: {location: Location, distance: number}) => item.location)
            .slice(0, 15);
          setVisibleLocations(closestLocations);
        }
        
        // CRITICAL: Signal that locations are loaded and then processed
        // First mark as loaded
        setLocationsLoaded();
        
        // Then after a small delay, mark as processed to ensure proper state transition
        setTimeout(() => {
          console.log('🚀 Signaling locations are processed');
          setLocationsProcessed();
        }, 200); // Increased delay to ensure visibleLocations are set
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLoadError('Failed to load locations. Please try again later.');
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [isMobile, setVisibleLocations, setLocationsLoaded, setLocationsProcessed, setLocationsLoading, visibleLocations.length, activeFilters, selectedAge, freeActivitiesFilter, openNowFilter]);

  // Get user location on component mount without a timeout to ensure we wait for user permission response
  useEffect(() => {
    const defaultLocation = { lat: 37.9838, lng: 23.7275 }; // Athens center
    
    // Initially, set map as not ready until we get location
    setMapReadyState(false);
    
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
          setMapReadyState(true);
          console.log('Location permission granted, using user location');
        },
        (error) => {
          // User denied permission or there was an error
          console.log('Geolocation not supported by browser, using default Athens location');
          setUserLocation(defaultLocation);
          setMapReadyState(true);
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
      setMapReadyState(true);
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
  
  // Create a ref to track the previous user location to prevent re-centering loops
  const prevUserLocationRef = useRef({ lat: 0, lng: 0 });
  const centeringInProgressRef = useRef(false);
  
  // Re-center when device type or user location changes while map is loaded
  useEffect(() => {
    // Exit early if map isn't ready or location is missing
    if (!map || !userLocation.lat || !userLocation.lng || !mapReadyState) return;
    
    // CRITICAL: Don't re-center if we're already in the middle of a centering operation
    if (centeringInProgressRef.current) {
      console.log('🔄 Skipping map re-centering - already in progress');
      return;
    }
    
    // CRITICAL: Check if location has changed significantly enough to re-center
    // This prevents infinite loops when small floating-point differences occur
    const prevLoc = prevUserLocationRef.current;
    const locDiff = Math.sqrt(
      Math.pow(userLocation.lat - prevLoc.lat, 2) +
      Math.pow(userLocation.lng - prevLoc.lng, 2)
    );
    
    // Only re-center if location has changed by more than a small threshold
    // or if this is the first time we're centering (prevLoc is 0,0)
    if (locDiff < 0.0001 && prevLoc.lat !== 0) {
      console.log('🔄 Skipping map re-centering - location change too small');
      return;
    }
    
    // Mark that centering is in progress to prevent re-entry
    centeringInProgressRef.current = true;
    
    // Save current location as previous for next comparison
    prevUserLocationRef.current = { ...userLocation };
    
    // The map is already initialized, so we can center immediately
    if (process.env.NODE_ENV === 'development') {
      console.log('Map re-centering: significant location change detected');
    }
    
    // Center the map on user location
    centerMapOnLocation(userLocation, 'initial-load');
    
    // After centering, clear the in-progress flag
    setTimeout(() => {
      centeringInProgressRef.current = false;
      
      // IMPORTANT: Mark initialization as complete after first centering
      // This will allow the drawer to update on subsequent map movements
      if (!initializationCompleteRef.current) {
        console.log('🚀 Map initialization complete - enabling drawer updates on map moves');
        initializationCompleteRef.current = true;
        
        // Force trigger bounds_changed to update locations with proper filtering
        console.log('🔍 LOCATION SOURCE 3: Forcing bounds_changed event');
        if (map) {
          // Tiny zoom change to trigger bounds_changed
          map.setZoom(map.getZoom()!);
        }
      }
      
      // Let the bounds_changed event handler update visible locations
      // This ensures we use consistent filtering logic throughout the app
      
    }, 300); // Longer timeout to ensure centering completes
  }, [map, userLocation, isMobile, centerMapOnLocation, mapReadyState, locations, visibleLocations.length, setVisibleLocations, drawerState]);

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
        
        // Update filter dropdown state in TouchContext
        if (isMobile) {
          setFilterDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchExpanded, setIsAgeDropdownOpen, isMobile, setFilterDropdownOpen]);

  // Track the last search term that was actually sent to analytics
  const lastTrackedSearchTermRef = useRef<string>("");
  
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    // Short debounce for UI responsiveness (search results)
    const uiDebounceTimeout = setTimeout(() => {
      // Use our enhanced search function that understands activities and ages
      const results = performEnhancedSearch(locations, searchTerm, activityConfig);
      
      // Limit to first 10 results for better performance
      setSearchResults(results.slice(0, 10));
      
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
    }, 150); // 150ms debounce for UI updates
    
    // Longer debounce for analytics tracking (only track after user stops typing)
    const analyticsDebounceTimeout = setTimeout(() => {
      // Only track the search if:
      // 1. The search term is valid (at least 3 characters)
      // 2. It's different from the last tracked search
      if (searchTerm.trim().length >= 3 && searchTerm !== lastTrackedSearchTermRef.current) {
        // Update the last tracked search term
        lastTrackedSearchTermRef.current = searchTerm;
        
        // Get fresh results for accurate count
        const results = performEnhancedSearch(locations, searchTerm, activityConfig);
        
        // Track the search query with analytics
        trackSearchQuery(
          searchTerm,
          results.length,
          activeFilters.length > 0,
          selectedAge !== null
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Analytics: Tracked completed search for "${searchTerm}" with ${results.length} results`);
        }
      }
    }, 1500); // 1.5 second debounce for analytics (wait until user stops typing)
    
    return () => {
      clearTimeout(uiDebounceTimeout);
      clearTimeout(analyticsDebounceTimeout);
    };
  // activityConfig is defined at the module level and won't change between renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, locations]);

  // Function to force update visible locations based on current map position
  // Note: This is now an internal helper and should only be called when necessary
  const updateVisibleLocations = useCallback(() => {
    if (!map || locations.length === 0) return;
    
    // Check if we're already in a validation cycle - avoid adding more updates
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 HELPER: Using existing validation logic instead of force-updating locations');
    }
    
    // Simply trigger the filter change effect by relying on our validation logic
    // This prevents duplicate state updates that could cause render loops
  }, [map, locations]);

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



  // Toggle for individual activity types
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleFilter = (type: ActivityType) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Toggle for activity groups
  const toggleGroupFilter = (groupKey: string) => {
    const group = ACTIVITY_GROUPS[groupKey];
    if (!group) return;
    
    // Check if group is already active
    const isGroupActive = activeGroups.includes(groupKey);
    
    // Update active groups
    setActiveGroups(prev =>
      isGroupActive
        ? prev.filter(g => g !== groupKey)
        : [...prev, groupKey]
    );
    
    // Update active filters based on the group's types
    setActiveFilters(prev => {
      if (isGroupActive) {
        // Remove all types in this group from active filters
        return prev.filter(t => !group.types.includes(t));
      } else {
        // Add all types in this group to active filters (avoiding duplicates)
        const newTypes = group.types.filter(t => !prev.includes(t as ActivityType));
        return [...prev, ...newTypes as ActivityType[]];
      }
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setActiveGroups([]);
    setSelectedAge(null);
    setOpenNowFilter(false);
    setFreeActivitiesFilter(false);
  };
  // Handle search select
  const handleSearchSelect = (location: Location, index: number = 0) => {
    console.log('Search item selected:', location.name);
    setSelectedLocation(location);
    setSearchExpanded(false);
    
    // When a user clicks a result, we need to ensure we track both the search and the click
    if (searchTerm) {
      // Force immediate tracking of the search term when a result is clicked
      // This ensures we capture the search even if the user clicks before the debounce period
      if (searchTerm.trim().length >= 3 && searchTerm !== lastTrackedSearchTermRef.current) {
        // Get fresh results for accurate count
        const results = performEnhancedSearch(locations, searchTerm, activityConfig);
        
        // Track the search immediately (override the debounce)
        trackSearchQuery(
          searchTerm,
          results.length,
          activeFilters.length > 0,
          selectedAge !== null
        );
        
        // Update the last tracked search term
        lastTrackedSearchTermRef.current = searchTerm;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Analytics: Force-tracked search for "${searchTerm}" on result click`);
        }
      }
      
      // Track the result click with the search term that led to it
      trackSearchResultClick(
        searchTerm,
        location.name,
        index,
        location.id,       // Include location ID for better reporting
        location.types     // Track activity types to analyze popular categories
      );
    }
    
    // Clear search term after tracking
    setSearchTerm('');
    
    // Track the marker click for analytics with enhanced parameters
    // Use 'search_result' as interaction method to differentiate from map clicks
    trackMarkerClick(
      location.name,
      location.id,
      location.types,
      'search_result'
    );
    
    if (map) {
      // On mobile, ensure the drawer opens and map pans correctly
      if (isMobile) {
        // First do a simple pan to the location
        map.panTo(location.coordinates);
        
        // Set drawer state to partial by default
            // Set drawer state to partial by default
            setDrawerState('partial');
        
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
    // Update filter dropdown state in TouchContext
    if (isMobile) {
      setFilterDropdownOpen(false);
    }
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
    
    // Signal to AppStateContext that map is ready
    setMapReady();
    
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
        setDrawerState('closed');
        // Mark as initialized so it doesn't automatically reopen
        drawerInitializedRef.current = true;
      } else {
        // On desktop, just deselect the location
        setSelectedLocation(null);
      }
      setHoveredLocation(null);
    });

    // Add listener for bounds_changed to update visible locations
    map.addListener('bounds_changed', () => {
      // Only skip updating visible locations during the initialization phase
      if (!initializationCompleteRef.current && drawerState !== 'closed' && visibleLocations.length > 0) {
        // Skip bounds_changed handling only during initialization to prevent clearing locations
        console.log('Skipping bounds_changed handling - still in initialization phase');
        return;
      }
      
      // CRITICAL CHANGE: Don't override locations when filter update is pending
      if (pendingUpdateRef.current && lastUpdateSourceRef.current === 'filter_change') {
        console.log('Skipping bounds_changed handling - filter update in progress');
        return;
      }
      
      // Don't update locations if a filter update has happened very recently
      const filterUpdateRecently = lastUpdateSourceRef.current === 'filter_change' &&
                                 (Date.now() - lastValidationTimeRef.current < 500);
      if (filterUpdateRecently) {
        console.log('Skipping bounds_changed handling - recent filter update');
        return;
      }
      
      // Log message for which approach we're using
      let logMessage = activeFilters.length > 0 || selectedAge !== null || openNowFilter || freeActivitiesFilter
        ? '🔍 LOCATION SOURCE 6: bounds_changed applying current filters'
        : '🔍 LOCATION SOURCE 6: bounds_changed updating visible locations (no active filters)';
        
      console.log(logMessage);
      
      // Mark that we're starting a bounds-based update
      lastUpdateSourceRef.current = 'bounds_changed';
      
      // Get the map center
      const center = map.getCenter();
      if (!center) {
        console.log('Cannot update locations: map center is undefined');
        return;
      }
      
      const mapCenterPosition = {
        lat: center.lat(),
        lng: center.lng()
      };
      
      // Always apply filters consistently
      const filteredLocations = filterLocations(locations);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Map bounds changed - ${filteredLocations.length} locations matching current view`);
      }
      
      // Skip the update if we have active filters and no matching locations
      // This prevents bouncing between 0 and 15 locations
      if ((activeFilters.length > 0 || selectedAge !== null || openNowFilter || freeActivitiesFilter) &&
          filteredLocations.length === 0) {
        console.log('Skipping bounds_changed update - no locations match current filters');
        return;
      }
      
      // Calculate distance for filtered locations from the current map center
      const locationsWithDistance = filteredLocations.map(location => {
        // Simple Euclidean distance (sufficient for sorting by relative distance)
        const distance = Math.sqrt(
          Math.pow(location.coordinates.lat - mapCenterPosition.lat, 2) +
          Math.pow(location.coordinates.lng - mapCenterPosition.lng, 2)
        );
        return { location, distance };
      });
      
      // Sort by distance (closest first)
      locationsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // CRITICAL CHANGE: When filters are active and return fewer than 15 results,
      // use all filtered locations instead of taking a subset
      let closestLocations: Location[];
      
      // If we have active filters and fewer than 15 filtered locations, use all of them
      if ((activeFilters.length > 0 || selectedAge !== null || openNowFilter || freeActivitiesFilter) &&
          filteredLocations.length < 15) {
        console.log(`🔍 Bounds changed: Using ALL ${filteredLocations.length} filtered locations`);
        closestLocations = filteredLocations;
      } else {
        // Otherwise get up to 15 closest filtered locations to map center
        closestLocations = locationsWithDistance
          .map(item => item.location)
          .slice(0, 15);
      }
      
      // To prevent update loops, only update if there's a meaningful change
      const currentLocIds = new Set(visibleLocations.map(loc => loc.id));
      const newLocIds = new Set(closestLocations.map(loc => loc.id));
      
      // Check if arrays are different by comparing IDs
      const needsUpdate =
        currentLocIds.size !== newLocIds.size ||
        closestLocations.some(loc => !currentLocIds.has(loc.id));
      
      if (needsUpdate) {
        // Update visible locations with the closest filtered locations
        console.log(`🔍 Setting ${closestLocations.length} locations from bounds_changed`);
        setVisibleLocations(closestLocations);
      } else {
        console.log('Skipping redundant visibleLocations update - no meaningful change');
      }
    });
    
    // Force a bounds_changed event after initialization to populate visible locations
    setTimeout(() => {
      // Using setTimeout to ensure the map is fully rendered
      map.setZoom(map.getZoom()!); // This triggers bounds_changed without changing the view
    }, 300);
  }, [locations, isMobile, setSelectedLocation, setHoveredLocation, setVisibleLocations, userLocation, centerMapOnLocation, setDrawerState, setMapReady, drawerState, visibleLocations, filterLocations, activeFilters.length, freeActivitiesFilter, openNowFilter, selectedAge]);

  // Handle drawer close action 
  const handleDrawerClose = useCallback(() => {
    if (isMobile) {
      // On mobile: Always close the drawer completely regardless of current state
      setSelectedLocation(null);
      setDrawerState('closed');
      
      // Only set drawer initialization flag if it was a direct user action
      // This allows the drawer to be reopened via "Show locations" button
      // Without this change, drawerInitializedRef.current = true would prevent auto-reopening
      console.log('Drawer explicitly closed by user action');
    } else {
      // On desktop, just deselect the location
      setSelectedLocation(null);
    }
  }, [isMobile, setDrawerState, setSelectedLocation]);
  
  // Handle back to list functionality - ensure locations are updated
  const handleBackToList = useCallback(() => {
  // Removed lastKnownLocations state and related effect - no longer needed
    // Skip during initial load or if no map is available
    if (!map || !mapReadyState || locations.length === 0) return;
    
    console.log('🔍 LOCATION SOURCE 4: Filter change detected - updating visible locations');
    
    // Apply all active filters to the entire locations dataset
    const filteredLocations = filterLocations(locations);
    console.log(`Filtered ${locations.length} locations down to ${filteredLocations.length} matching current filters`);
    
    // If map has a center point, calculate distances from there
    const mapCenter = map.getCenter();
    if (mapCenter) {
      const mapCenterPosition = {
        lat: mapCenter.lat(),
        lng: mapCenter.lng()
      };
      
      // Calculate distance for filtered locations from the current map center
      const locationsWithDistance = filteredLocations.map(location => {
        const distance = Math.sqrt(
          Math.pow(location.coordinates.lat - mapCenterPosition.lat, 2) +
          Math.pow(location.coordinates.lng - mapCenterPosition.lng, 2)
        );
        return { location, distance };
      });
      
      // Sort by distance (closest first)
      locationsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // Get up to 15 closest filtered locations to map center
      const closestLocations = locationsWithDistance
        .map(item => item.location)
        .slice(0, 15);
      
      // Update visible locations
      setVisibleLocations(closestLocations);
    } else {
      // If no map center available, just take the first 15 filtered locations
      setVisibleLocations(filteredLocations.slice(0, 15));
    }
    
  }, [map, mapReadyState, locations, filterLocations, setVisibleLocations]);

  // Add validation effect to both monitor and FIX visibleLocations
  useEffect(() => {
    // Record the timing of this validation run
    const currentTime = Date.now();
    const timeSinceLastValidation = currentTime - lastValidationTimeRef.current;
    
    // Simple debounce - if we've validated within the last 200ms, skip this run
    if (timeSinceLastValidation < 200) {
      console.log(`🔄 Skipping validation - too soon after last run (${timeSinceLastValidation}ms)`);
      return;
    }
    
    // Update validation timing
    lastValidationTimeRef.current = currentTime;
    
    // Check if an update is already pending
    if (pendingUpdateRef.current) {
      console.log(`🔄 Skipping validation - update already pending from ${lastUpdateSourceRef.current}`);
      return;
    }
    
    console.log(`🔍 VISIBLE LOCATIONS CHANGED: ${visibleLocations.length} locations from ${lastUpdateSourceRef.current || 'unknown source'}`);
    
    if (visibleLocations.length > 0) {
      // Only validate when filters are active (no need otherwise)
      if (activeFilters.length > 0 || selectedAge !== null || freeActivitiesFilter || openNowFilter) {
        // Check if all visible locations match filters
        let hasInvalidLocation = false;
        let invalidCount = 0;
        
        visibleLocations.forEach(location => {
          let isValid = true;
          
          // Filter by activity type
          if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔴 Location doesn't match activity filters: ${location.name}`);
            }
            isValid = false;
            invalidCount++;
          }
          
          // Filter by age
          if (selectedAge !== null && isValid) {
            if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Location doesn't match age filter: ${location.name}`);
              }
              isValid = false;
              invalidCount++;
            }
          }
          
          // Filter by price (free activities)
          if (freeActivitiesFilter && location.priceRange !== "Free" && isValid) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔴 Location doesn't match free filter: ${location.name}`);
            }
            isValid = false;
            invalidCount++;
          }
          
          // Filter by open now
          if (openNowFilter && isValid) {
            const now = new Date();
            const day = now.toLocaleDateString('en-US', { weekday: 'long' });
            const hours = location.openingHours[day];
            if (!hours || hours === 'Closed' || hours === 'Hours not available') {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Location doesn't match open now filter: ${location.name}`);
              }
              isValid = false;
              invalidCount++;
            }
          }
          
          if (!isValid) {
            hasInvalidLocation = true;
          }
        });
        
        if (hasInvalidLocation) {
          console.log(`🔴 WARNING: ${invalidCount}/${visibleLocations.length} locations don't match current filters - ENFORCING FILTERS`);
          
          // Get properly filtered locations
          const properlyFilteredLocations = filterLocations(locations);
          
          // CRITICAL: Check if the new set would be SUBSTANTIALLY different
          // If the filtered count is the same as our current valid count, it's likely we're just
          // seeing a conflict between different update sources
          const currentValidCount = visibleLocations.length - invalidCount;
          
          // If the number of properly filtered locations is similar to our current valid locations,
          // it suggests our current set is already mostly correct and we might be in a loop
          if (properlyFilteredLocations.length > 0 && Math.abs(properlyFilteredLocations.length - currentValidCount) <= 2) {
            console.log(`⚠️ Filtered count (${properlyFilteredLocations.length}) similar to current valid count (${currentValidCount}) - possible update conflict`);
            
            // Check if we already fixed this recently - avoid ping-ponging between states
            if (lastValidationResultRef.current === 'fixed') {
              console.log(`🛑 Breaking potential update loop - skipping validation fix`);
              lastValidationResultRef.current = 'invalid';
              return;
            }
          }
          
          console.log(`🛠️ Fixing visible locations: Filtered ${locations.length} locations down to ${properlyFilteredLocations.length} matching filters`);
          
          // Mark that we're starting an update
          pendingUpdateRef.current = true;
          lastUpdateSourceRef.current = 'validation_fix';
          lastValidationResultRef.current = 'fixed';
          
          // Sort by distance if map center is available
          const mapCenter = map?.getCenter();
          if (mapCenter && map) {
            const mapCenterPosition = {
              lat: mapCenter.lat(),
              lng: mapCenter.lng()
            };
            
            // Calculate distance for filtered locations
            const locationsWithDistance = properlyFilteredLocations.map(location => {
              const distance = Math.sqrt(
                Math.pow(location.coordinates.lat - mapCenterPosition.lat, 2) +
                Math.pow(location.coordinates.lng - mapCenterPosition.lng, 2)
              );
              return { location, distance };
            });
            
            // Sort by distance and take 15 closest (or fewer if that's all we have)
            locationsWithDistance.sort((a, b) => a.distance - b.distance);
            const closestLocations = locationsWithDistance
              .map(item => item.location)
              .slice(0, 15);
            
            setVisibleLocations(closestLocations);
          } else {
            // No map center available, just take first 15 filtered locations (or fewer)
            setVisibleLocations(properlyFilteredLocations.slice(0, 15));
          }
          
          // Clear pending update after a small delay to allow state to settle
          setTimeout(() => {
            pendingUpdateRef.current = false;
          }, 50);
        } else {
          // Everything is valid
          console.log(`✅ All visible locations match current filters`);
          lastValidationResultRef.current = 'valid';
        }
      } else {
        console.log(`✅ No filters active - locations don't need validation`);
        lastValidationResultRef.current = '';
      }
    }
  }, [visibleLocations, activeFilters, selectedAge, freeActivitiesFilter, openNowFilter, filterLocations, locations, map, setVisibleLocations]);

  // Handle location selection from tile or marker
  const handleLocationSelect = useCallback((location: Location, source: 'map_click' | 'list_item' = 'map_click') => {
    setSelectedLocation(location);
    
    // Track with enhanced parameters to identify interaction source
    trackMarkerClick(
      location.name,
      location.id,
      location.types,
      source
    );
    
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
  }, [map, isMobile, centerMapOnLocation, setSelectedLocation]);

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
      <div
        className={`bg-white p-2 overflow-x-auto shadow-sm z-filter-bar no-scrollbar ${isMobile ? 'fixed top-16 left-0 right-0 w-full' : 'relative'}`}
        onTouchStart={(e) => {
          // Prevent touch events from reaching the map
          e.stopPropagation();
          
          // When drawer is open, prevent all interaction with the filter bar
          if (isMobile && drawerState !== 'closed') {
            e.preventDefault();
          }
        }}
        onTouchMove={(e) => {
          // Always stop propagation to prevent map interaction
          e.stopPropagation();
          
          // When drawer is open, prevent all interaction with the filter bar
          if (isMobile && drawerState !== 'closed') {
            e.preventDefault();
          }
          // Otherwise, allow horizontal scrolling for filters (don't prevent default)
        }}
        onTouchEnd={(e) => {
          // Prevent touch events from reaching the map
          e.stopPropagation();
          
          // When drawer is open, prevent all interaction with the filter bar
          if (isMobile && drawerState !== 'closed') {
            e.preventDefault();
          }
        }}
        style={{
          touchAction: drawerState !== 'closed' ? 'none' : 'pan-x', // Disable all touch actions when drawer is open
          pointerEvents: 'auto', // Ensure all pointer events are captured
          zIndex: 'var(--z-filter-bar)' // Use CSS variable for z-index
        }}
      >
        <div className="flex items-center gap-2">
          {/* Search Component */}
          <div ref={searchRef} className="relative z-search-container">
            <div className={`flex items-center transition-all duration-200 ${
              searchExpanded ? 'w-64' : 'w-10'
            }`}>
              <button
                onClick={() => {
                  const newExpandedState = !searchExpanded;
                  setSearchExpanded(newExpandedState);
                  
                  // Update filter dropdown state in TouchContext for mobile
                  if (isMobile) {
                    setFilterDropdownOpen(newExpandedState);
                  }
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  // When drawer is open, prevent all interaction
                  if (isMobile && drawerState !== 'closed') {
                    e.preventDefault();
                  }
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  // When drawer is open, prevent all interaction
                  if (isMobile && drawerState !== 'closed') {
                    e.preventDefault();
                  }
                }}
                disabled={isMobile && drawerState !== 'closed'} // Disable when drawer is open
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
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      // When drawer is open, prevent all interaction
                      if (isMobile && drawerState !== 'closed') {
                        e.preventDefault();
                      }
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                      // When drawer is open, prevent all interaction
                      if (isMobile && drawerState !== 'closed') {
                        e.preventDefault();
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      // When drawer is open, prevent all interaction
                      if (isMobile && drawerState !== 'closed') {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-gray-200"></div>

          {/* Activity Group Filters */}
          <div
            className="flex gap-2 snap-x snap-mandatory overflow-x-auto no-scrollbar"
            onTouchStart={(e) => {
              // Allow the scroll to happen but prevent propagation
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Allow horizontal scrolling but prevent propagation
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            style={{
              touchAction: 'pan-x', // Allow horizontal scrolling
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              pointerEvents: 'auto'
            }}
          >
            {Object.entries(ACTIVITY_GROUPS).map(([groupKey, group]) => (
              <GroupFilterDropdown
                key={groupKey}
                groupKey={groupKey}
                groupName={group.name}
                groupColor={group.color}
                groupTypes={group.types}
                activeFilters={activeFilters}
                activeGroups={activeGroups}
                onToggleGroup={toggleGroupFilter}
                onToggleFilter={toggleFilter}
              />
            ))}

            {/* Age Filter */}
            <div
              ref={ageDropdownRef}
              className="relative"
              onTouchStart={(e) => {
                e.stopPropagation();
                // When drawer is open, prevent all interaction
                if (isMobile && drawerState !== 'closed') {
                  e.preventDefault();
                }
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                // When drawer is open, prevent all interaction
                if (isMobile && drawerState !== 'closed') {
                  e.preventDefault();
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                // When drawer is open, prevent all interaction
                if (isMobile && drawerState !== 'closed') {
                  e.preventDefault();
                }
              }}
            >
              <button
                onClick={() => {
                  const newDropdownState = !isAgeDropdownOpen;
                  setIsAgeDropdownOpen(newDropdownState);
                  // Update filter dropdown state in TouchContext
                  if (isMobile) {
                    setFilterDropdownOpen(newDropdownState);
                  }
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  // When drawer is open, prevent all interaction
                  if (isMobile && drawerState !== 'closed') {
                    e.preventDefault();
                  }
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  // When drawer is open, prevent all interaction
                  if (isMobile && drawerState !== 'closed') {
                    e.preventDefault();
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${selectedAge !== null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                style={{
                  touchAction: 'manipulation', // Optimize for tap/click
                  pointerEvents: drawerState !== 'closed' ? 'none' : 'auto' // Disable pointer events when drawer is open
                }}
                disabled={isMobile && drawerState !== 'closed'} // Disable button when drawer is open
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
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${openNowFilter
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              style={{
                touchAction: 'manipulation' // Optimize for tap/click
              }}
            >
              Open Now
            </button>

            {/* Clear Filters - visible only on desktop when filters are active */}
            {!isMobile && (activeFilters.length > 0 || activeGroups.length > 0 || selectedAge !== null || openNowFilter) && (
              <button
                onClick={clearFilters}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100"
                style={{
                  touchAction: 'manipulation' // Optimize for tap/click
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only floating Clear All button */}
      {isMobile && (activeFilters.length > 0 || activeGroups.length > 0 || selectedAge !== null || openNowFilter || freeActivitiesFilter) && (
        <button
          onClick={clearFilters}
          className={`fixed z-mobile-button shadow-sm border rounded-full px-3 py-1.5 text-xs flex items-center gap-1 ${
            locations.filter(location => {
              // Check against active filters
              if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
                return false;
              }
              // Check against age filter
              if (selectedAge !== null) {
                if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
                  return false;
                }
              }
              // Check against open now filter
              if (openNowFilter) {
                const now = new Date();
                const day = now.toLocaleDateString('en-US', { weekday: 'long' });
                const hours = location.openingHours[day];
                if (!hours || hours === 'Closed' || hours === 'Hours not available') {
                  return false;
                }
              }
              return true;
            }).length === 0
              ? "bg-red-50 border-red-200 text-red-600 font-bold"
              : "bg-white bg-opacity-75 border-gray-200 text-red-600 font-medium"
          }`}
          style={{
            top: '120px', // Increased position to ensure it's below filter bar (header 64px + filter bar 42px)
            left: '8px', // Align to the left with some padding
            transition: 'opacity 0.2s ease-in-out',
            maxWidth: 'min(calc(100vw - 20px), 260px)', // Wider with less constraint
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {/* Check if the filtered locations list is empty */}
          {locations.filter(location => {
            // Check against active filters
            if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
              return false;
            }
            // Check against age filter
            if (selectedAge !== null) {
              if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
                return false;
              }
            }
            // Check against free activities filter
            if (freeActivitiesFilter && location.priceRange !== "Free") {
              return false;
            }
            // Check against open now filter
            if (openNowFilter) {
              const now = new Date();
              const day = now.toLocaleDateString('en-US', { weekday: 'long' });
              const hours = location.openingHours[day];
              if (!hours || hours === 'Closed' || hours === 'Hours not available') {
                return false;
              }
            }
            return true;
          }).length === 0 ? "No Matching Locations - Clear Filters" : "Clear Filters"}
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
        {!mapReadyState && (
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
              opacity: mapReadyState ? 1 : 0, // Completely hide map until fully ready
              transition: 'opacity 0.5s ease-in-out',
              pointerEvents: (mapReadyState && !isMapBlocked) ? 'auto' : 'none', // Prevent interaction when blocked
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
                if (freeActivitiesFilter) {
                  // Check if priceRange is "Free" for the free activities filter
                  if (location.priceRange !== "Free") {
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
                        // Explicitly pass 'map_click' as the interaction source
                        handleLocationSelect(location, 'map_click');
                        // Set drawer state to partial by default
                        setDrawerState('partial');
                      }, 50);
                    } else {
                      // On desktop, open drawer immediately
                      // Explicitly pass 'map_click' as the interaction source
                      handleLocationSelect(location, 'map_click');
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
            , [locations, activeFilters, selectedAge, openNowFilter, freeActivitiesFilter, selectedLocation, hoveredLocation, getMarkerIcon, handleLocationSelect, isMobile, setDrawerState, setHoveredLocation, getZIndexValue])}

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
              onLocationSelect={(location) => handleLocationSelect(location, 'list_item')}
              mobileDrawerOpen={drawerState !== 'closed'}
              backToList={() => {
                // Transition to list view on mobile while preserving drawer state
                handleBackToList();
                
                // Ensure drawer state is preserved in TouchContext
                // When going back to list from detail, always keep the drawer visible
                if (drawerState === 'closed') {
                  // If drawer was somehow closed, set to partial
                  setDrawerState('partial');
                }
                // else keep current state (partial or full)
                
                console.log('Back to list: drawer state =', drawerState);
              }}
            />

            {/* Hover InfoWindow is handled via useEffect with infoWindowRef */}
            </GoogleMap>
          </div>
        </LoadScriptNext>
        
      {/* Mobile Drawer Floating Button - Always rendered on mobile, but only visible when drawer is closed */}
      {isMobile && (
        <button
          onClick={() => {
            // Always set drawer to partial state when button is clicked
            setDrawerState('partial');
            // Reset initialization flag so drawer opens consistently
            drawerInitializedRef.current = true;
            console.log('Floating button clicked - opening drawer');
            
            // Force update visible locations when reopening drawer
            updateVisibleLocations();
          }}
          onTouchStart={(e) => {
            // Prevent touch events from reaching the map
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent scrolling and stop propagation
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            // Prevent touch events from reaching the map
            e.stopPropagation();
          }}
          className="fixed z-mobile-button bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-full bg-white hover:bg-gray-50 shadow-lg flex items-center gap-2 border border-gray-200"
          style={{
            touchAction: 'none', // Prevent all touch actions
            pointerEvents: 'auto', // Ensure all pointer events are captured
            opacity: drawerState === 'closed' ? 1 : 0, // Hide when drawer is open
            visibility: drawerState === 'closed' ? 'visible' : 'hidden', // Hide from screen readers when drawer is open
            transition: 'opacity 0.3s ease-out, visibility 0.3s ease-out' // Smooth transition
          }}
          aria-label="Show locations"
          aria-hidden={drawerState !== 'closed'} // Hide from screen readers when drawer is open
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}
      
      {/* Custom My Location Button */}
      {mapReadyState && (
        <div
          className="absolute z-mobile-button"
          style={{
            // Position calculation for mobile and desktop
            top: isMobile ? '132px' : '76px',  // Fixed positioning below the filter bar
            right: '15px',
            pointerEvents: 'auto'
          }}
          onTouchStart={(e) => {
            // Prevent touch events from reaching the map
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent scrolling and stop propagation
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            // Prevent touch events from reaching the map
            e.stopPropagation();
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
              touchAction: 'none' // Prevent all touch actions
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