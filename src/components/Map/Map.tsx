import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, LoadScriptNext, Marker, Libraries } from '@react-google-maps/api';
import { useLocation } from 'react-router-dom';
import Drawer from './Drawer';
import { ActivityType, Location } from '../../types/location';
import { trackMarkerClick } from '../../utils/analytics';
import { useMobile } from '../../contexts/MobileContext';
import { useTouch } from '../../contexts/TouchContext';
import { useAppState } from '../../contexts/AppStateContext';
import { useUserLocation } from '../../contexts/UserLocationContext';
import MapBlockingOverlay from './MapBlockingOverlay';
import GroupFilterDropdown from './GroupFilterDropdown';
import AgeFilterDropdown from './AgeFilterDropdown';
import PriceFilterDropdown, { PriceOption } from './PriceFilterDropdown';
import { getLocations } from '../../utils/firebase-service';
import SEO from '../SEO'; // Import SEO component
import { ACTIVITY_CATEGORIES, ACTIVITY_GROUPS } from '../../utils/metadata';

// Using MobileContext instead of local mobile detection

// Define libraries as a static constant to prevent recreating the array on each render
// This prevents the "LoadScript has been reloaded unintentionally" warning
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapProps {
  // No longer need locations as props, as we'll fetch them from Firebase
}



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
  // Get user location from context
  const { userLocation: contextUserLocation, locationLoaded } = useUserLocation();
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

  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceOption>(null);
  const [maps, setMaps] = useState<typeof google.maps | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Use location from context instead of managing location state locally
  const [userLocation] = useState(contextUserLocation);
  const [visibleLocations, setVisibleLocations] = useState<Location[]>([]);
  const [drawerLocations, setDrawerLocations] = useState<Location[]>([]);
  const [mapReadyState, setMapReadyState] = useState(false);
  // This ref was removed as we simplified the map initialization logic


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
      
      // Filter by price
      if (selectedPrice !== null) {
        // For "Free" price option
        if (selectedPrice === "Free" && location.priceRange !== "Free") {
          return false;
        }
        // For the other price options (€, €€, €€€)
        else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
          return false;
        }
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
  }, [activeFilters, selectedAge, selectedPrice, openNowFilter]);

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
    setSelectedPrice(null);
    setSelectedAge(null);
    setOpenNowFilter(false);
    
    // Process activity group filter
    const filterParam = queryParams.get('filter');
    if (filterParam) {
      if (Object.keys(ACTIVITY_GROUPS).includes(filterParam)) {
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
    
    // Process price filter
    const priceParam = queryParams.get('price');
    if (priceParam) {
      const validPrices: PriceOption[] = ['Free', '€', '€€', '€€€'];
      if (validPrices.includes(priceParam as PriceOption)) {
        console.log(`Applying price filter from URL: ${priceParam}`);
        setSelectedPrice(priceParam as PriceOption);
      }
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
    
    // Process locationId parameter (for direct linking to a location)
    const locationIdParam = queryParams.get('locationId');
    if (locationIdParam) {
      console.log(`Found locationId in URL: ${locationIdParam}`);
      // We'll handle setting the selected location in the next step
      // This just logs the detection for now
    }
    
    // Log all applied filters
    if (process.env.NODE_ENV === 'development') {
      const appliedFilters = [];
      if (filterParam) appliedFilters.push(`filter=${filterParam}`);
      if (priceParam) appliedFilters.push(`price=${priceParam}`);
      if (ageParam) appliedFilters.push(`age=${ageParam}`);
      if (openNowParam) appliedFilters.push(`open=${openNowParam}`);
      if (locationIdParam) appliedFilters.push(`locationId=${locationIdParam}`);
      
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
    console.log(`🔍 FILTER CHANGE DETECTED - activeFilters: ${activeFilters.length}, age: ${selectedAge}, openNow: ${openNowFilter}, price: ${selectedPrice}`);
    
    // Reset the debounce timer to ensure validation runs after this update
    lastValidationTimeRef.current = 0;
    
    // Force cancel any pending updates
    pendingUpdateRef.current = false;
    
    // Mark this as a high-priority filter-based update
    lastUpdateSourceRef.current = 'filter_change';
    
    // Apply all active filters to get the filtered locations
    const filteredLocations = filterLocations(locations);
    console.log(`Filter change: ${locations.length} locations filtered to ${filteredLocations.length} matching current filters`);
    
    // IMPORTANT: Update drawer locations with ALL matching filtered locations
    // This ensures the drawer always shows the correct filtered content
    setDrawerLocations(filteredLocations.slice(0, Math.min(filteredLocations.length, 15)));
    console.log(`🔍 Setting drawerLocations to ${Math.min(filteredLocations.length, 15)} filtered locations`);
    
    // For map markers, find the closest ones to the current view
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
    
    // Set visible locations for map markers
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
    
  }, [activeFilters, selectedAge, openNowFilter, selectedPrice, map, mapReadyState, locations, filterLocations]);
  
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
            
            // Filter by price
            if (selectedPrice !== null) {
              // Handle the "Free" price option
              if (selectedPrice === "Free" && location.priceRange !== "Free") {
                return false;
              }
              // Handle the other price options (€, €€, €€€)
              else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
                return false;
              }
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
          if (activeFilters.length > 0 || selectedAge !== null || openNowFilter || selectedPrice !== null) {
            console.log('🔍 LOCATION SOURCE 4: Back to list - updating both map markers and drawer content with filters (age, price, open now)');
            // Don't set visibleLocations here - let the filter change effect handle it
          } else {
          // Simplify and unify location source for both mobile and desktop
          // This avoids having different loading paths for mobile vs desktop
          console.log('🔍 LOCATION SOURCE 1: Pre-populating filtered visibleLocations for drawer (no active filters)');
          setVisibleLocations(filteredLocations.slice(0, 15));
          // Also initialize drawerLocations with the same content
          setDrawerLocations(filteredLocations.slice(0, 15));
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
            
            // Apply filters to fresh data
            const filteredLocations = freshLocations.filter((location: Location) => {
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
              
              // Filter by price
              if (selectedPrice !== null) {
                // Handle the "Free" price option
                if (selectedPrice === "Free" && location.priceRange !== "Free") {
                  return false;
                }
                // Handle the other price options (€, €€, €€€)
                else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
                  return false;
                }
              }
              
              // Filter by open now
              if (openNowFilter) {
                const now = new Date();
                const day = now.toLocaleDateString('en-US', { weekday: 'long' });
                const hours = location.openingHours[day];
                
                if (!hours || hours === 'Closed' || hours === 'Hours not available') {
                  return false;
                }
                // Additional open now logic omitted for brevity
              }
              
              return true;
            });
            
            // Update drawerLocations with filtered fresh data
            setDrawerLocations(filteredLocations.slice(0, 15));
            
            // Update visibleLocations (map markers) with fresh data
            if (!isMobile) {
              setVisibleLocations(filteredLocations.slice(0, 15));
            } else {
              // Update mobile locations too
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
          
          // Filter by price
          if (selectedPrice !== null) {
            // Handle the "Free" price option
            if (selectedPrice === "Free" && location.priceRange !== "Free") {
              return false;
            }
            // Handle the other price options (€, €€, €€€)
            else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
              return false;
            }
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
          // Also initialize drawerLocations with the same content
          setDrawerLocations(closestLocations);
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
  }, [isMobile, setVisibleLocations, setLocationsLoaded, setLocationsProcessed, setLocationsLoading, visibleLocations.length, activeFilters, selectedAge, selectedPrice, openNowFilter]);

  // Set map ready state based on location loaded status from context
  useEffect(() => {
    if (locationLoaded) {
      setMapReadyState(true);
      console.log('Using location from context:', userLocation);
    } else {
      setMapReadyState(false);
    }
  }, [locationLoaded, userLocation]);
  
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
  
  // New effect to handle locationId parameter from URL
  useEffect(() => {
    // Skip if locations aren't loaded yet or map isn't ready
    if (locations.length === 0) return;
    
    // Get locationId from URL parameters
    const queryParams = new URLSearchParams(location.search);
    const locationIdParam = queryParams.get('locationId');
    
    if (locationIdParam) {
      console.log(`Looking for location with ID: ${locationIdParam}`);
      
      // Find the matching location in our data
      const matchingLocation = locations.find(loc => loc.id === locationIdParam);
      
      if (matchingLocation) {
        console.log(`Found matching location: ${matchingLocation.name}`);
        
        // Select the location (this will show the detail in the drawer)
        setSelectedLocation(matchingLocation);
        
        // On mobile, ensure the drawer is visible
        if (isMobile) {
          setDrawerState('partial');
        }
        
        // If map is ready, center on this location
        if (map && mapReadyState) {
          // Center map on the location
          centerMapOnLocation(matchingLocation.coordinates, 'marker-selection');
        }
      } else {
        console.log(`No location found with ID: ${locationIdParam}`);
      }
    }
  }, [locations, location.search, map, mapReadyState, setSelectedLocation, setDrawerState, isMobile, centerMapOnLocation]);

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
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(event.target as Node)) {
        // Update filter dropdown state in TouchContext
        if (isMobile) {
          setFilterDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, setFilterDropdownOpen]);


  


  // Function to force update both drawer locations and map markers based on current filters and map position
  // This is a helper function that manually triggers updates when needed
  const updateVisibleLocations = useCallback(() => {
    if (!map || locations.length === 0) return;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 HELPER: Force-updating both drawer locations and map markers with current filters');
    }
    
    // Apply all active filters to the entire locations dataset
    const filteredLocations = filterLocations(locations);
    
    // First update drawerLocations with filtered results (limited to 15)
    setDrawerLocations(filteredLocations.slice(0, 15));
    
    // Then update visibleLocations for map markers based on proximity
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
      
      // Sort by distance and get closest locations
      locationsWithDistance.sort((a, b) => a.distance - b.distance);
      const closestLocations = locationsWithDistance
        .map(item => item.location)
        .slice(0, 15);
      
      // Update map markers
      setVisibleLocations(closestLocations);
    } else {
      // No map center, use the same locations for both states
      setVisibleLocations(filteredLocations.slice(0, 15));
    }
  }, [map, locations, filterLocations, setVisibleLocations, setDrawerLocations]);

  // Get marker icon based on location's primary type or first type in the array
  const getMarkerIcon = useCallback((location: Location) => {
    // First check if any of the location's types match the active filters
    const matchingType = location.types.find(type => activeFilters.includes(type));
    
    // If we have active filters and found a matching type, use that
    // Otherwise fall back to primary type or first type
    const displayType = (activeFilters.length > 0 && matchingType)
      ? matchingType
      : (location.primaryType || location.types[0]);

    return {
      fillColor: activityConfig[displayType].color,
      fillOpacity: 1,
      path: 'M-6,0 C-6,-6 6,-6 6,0 C6,6 0,12 0,12 C0,12 -6,6 -6,0 Z',
      scale: 1.5,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    };
  }, [activeFilters]);

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
    setSelectedPrice(null);
  };




  const handleAgeSelect = (age: number | null) => {
    setSelectedAge(age);
    // Update filter dropdown state in TouchContext
    if (isMobile) {
      setFilterDropdownOpen(false);
    }
  };

  const handlePriceSelect = (price: PriceOption) => {
    setSelectedPrice(price);
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

    // Add listener for bounds_changed to update visible locations (map markers only)
    map.addListener('bounds_changed', () => {
      // Only skip updating visible locations during the initialization phase
      if (!initializationCompleteRef.current && drawerState !== 'closed' && visibleLocations.length > 0) {
        // Skip bounds_changed handling only during initialization to prevent clearing locations
        console.log('Skipping bounds_changed handling - still in initialization phase');
        return;
      }
      
      // CRITICAL CHANGE: The bounds_changed event now ONLY affects map markers (visibleLocations)
      // and no longer impacts the drawer content (drawerLocations)
      
      let logMessage = activeFilters.length > 0 || selectedAge !== null || openNowFilter || selectedPrice !== null
        ? '🔍 LOCATION SOURCE 6: bounds_changed applying current filters to MAP MARKERS ONLY'
        : '🔍 LOCATION SOURCE 6: bounds_changed updating map markers only (no active filters)';
        
      console.log(logMessage);
      
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
      if ((activeFilters.length > 0 || selectedAge !== null || openNowFilter || selectedPrice !== null) &&
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
      
      // Get up to 15 closest filtered locations to map center
      const closestLocations = locationsWithDistance
        .map(item => item.location)
        .slice(0, 15);
      
      // To prevent update loops, only update if there's a meaningful change
      const currentLocIds = new Set(visibleLocations.map(loc => loc.id));
      const newLocIds = new Set(closestLocations.map(loc => loc.id));
      
      // Check if arrays are different by comparing IDs
      const needsUpdate =
        currentLocIds.size !== newLocIds.size ||
        closestLocations.some(loc => !currentLocIds.has(loc.id));
      
      if (needsUpdate) {
        // Update visible locations with the closest filtered locations
        // IMPORTANT: We now ONLY update visibleLocations (map markers) here
        // drawerLocations remain unchanged when map bounds change
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
  }, [locations, isMobile, setSelectedLocation, setHoveredLocation, setVisibleLocations, userLocation, centerMapOnLocation, setDrawerState, setMapReady, drawerState, visibleLocations, filterLocations, activeFilters.length, openNowFilter, selectedAge, selectedPrice]);

  // Handle drawer close action 
  const handleDrawerClose = useCallback(() => {
    // Check if we need to update the URL by removing locationId parameter
    const queryParams = new URLSearchParams(window.location.search);
    const hasLocationParam = queryParams.has('locationId');
    
    if (hasLocationParam) {
      // Remove the locationId parameter
      queryParams.delete('locationId');
      
      // Create new URL without the locationId parameter
      const newUrl = queryParams.toString()
        ? `${window.location.pathname}?${queryParams.toString()}`
        : window.location.pathname;
      
      // Update the URL without causing a page reload
      window.history.replaceState({}, '', newUrl);
      console.log('Removed locationId parameter from URL');
    }
    
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
    
    console.log('🔍 LOCATION SOURCE 4: Back to list - updating both map markers and drawer content');
    
    // Apply all active filters to the entire locations dataset
    const filteredLocations = filterLocations(locations);
    console.log(`Filtered ${locations.length} locations down to ${filteredLocations.length} matching current filters`);
    
    // IMPORTANT: First update drawerLocations with filtered results (limited to 15)
    // This ensures the drawer shows the correct filtered content immediately
    setDrawerLocations(filteredLocations.slice(0, 15));
    console.log(`Setting drawerLocations to ${Math.min(filteredLocations.length, 15)} filtered locations`);
    
    // Then update visibleLocations for map markers based on proximity to map center
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
      
      // Update map markers
      setVisibleLocations(closestLocations);
      console.log(`Setting visibleLocations to ${closestLocations.length} map-centered locations`);
    } else {
      // If no map center available, just take the first 15 filtered locations for map markers too
      setVisibleLocations(filteredLocations.slice(0, 15));
    }
    
  }, [map, mapReadyState, locations, filterLocations, setVisibleLocations, setDrawerLocations]);

  // Add validation effect to monitor and fix map markers only (visibleLocations)
  // In our new architecture, drawerLocations are independently managed and don't need validation
  useEffect(() => {
    // Record the timing of this validation run
    const currentTime = Date.now();
    const timeSinceLastValidation = currentTime - lastValidationTimeRef.current;
    
    // Simple debounce - if we've validated within the last 200ms, skip this run
    if (timeSinceLastValidation < 200) {
      console.log(`🔄 Skipping map markers validation - too soon after last run (${timeSinceLastValidation}ms)`);
      return;
    }
    
    // Update validation timing
    lastValidationTimeRef.current = currentTime;
    
    // Check if an update is already pending
    if (pendingUpdateRef.current) {
      console.log(`🔄 Skipping map markers validation - update already pending from ${lastUpdateSourceRef.current}`);
      return;
    }
    
    console.log(`🔍 MAP MARKERS CHANGED: ${visibleLocations.length} locations from ${lastUpdateSourceRef.current || 'unknown source'}`);
    
    if (visibleLocations.length > 0) {
      // Only validate when filters are active (no need otherwise)
      if (activeFilters.length > 0 || selectedAge !== null || selectedPrice !== null || openNowFilter) {
        // Check if all visible locations match filters
        let hasInvalidLocation = false;
        let invalidCount = 0;
        
        visibleLocations.forEach(location => {
          let isValid = true;
          
          // Filter by activity type
          if (activeFilters.length > 0 && !location.types.some(type => activeFilters.includes(type))) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔴 Map marker doesn't match activity filters: ${location.name}`);
            }
            isValid = false;
            invalidCount++;
          }
          
          // Filter by age
          if (selectedAge !== null && isValid) {
            if (selectedAge < location.ageRange.min || selectedAge > location.ageRange.max) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Map marker doesn't match age filter: ${location.name}`);
              }
              isValid = false;
              invalidCount++;
            }
          }
          
          // Filter by price
          if (selectedPrice !== null && isValid) {
            if (selectedPrice === "Free" && location.priceRange !== "Free") {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Map marker doesn't match Free price filter: ${location.name}`);
              }
              isValid = false;
              invalidCount++;
            } else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Map marker doesn't match price filter (${selectedPrice}): ${location.name}`);
              }
              isValid = false;
              invalidCount++;
            }
          }
          
          // Filter by open now
          if (openNowFilter && isValid) {
            const now = new Date();
            const day = now.toLocaleDateString('en-US', { weekday: 'long' });
            const hours = location.openingHours[day];
            if (!hours || hours === 'Closed' || hours === 'Hours not available') {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔴 Map marker doesn't match open now filter: ${location.name}`);
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
          console.log(`🔴 WARNING: ${invalidCount}/${visibleLocations.length} map markers don't match current filters - ENFORCING FILTERS`);
          
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
          
          console.log(`🛠️ Fixing map markers: Filtered ${locations.length} locations down to ${properlyFilteredLocations.length} matching filters`);
          
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
            
            // IMPORTANT: Only update visibleLocations (map markers), not drawerLocations
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
          console.log(`✅ All map markers match current filters`);
          lastValidationResultRef.current = 'valid';
        }
      } else {
        console.log(`✅ No filters active - map markers don't need validation`);
        lastValidationResultRef.current = '';
      }
    }
  }, [visibleLocations, activeFilters, selectedAge, openNowFilter, filterLocations, locations, map, setVisibleLocations, selectedPrice]);

  // Handle location selection from tile or marker
  const handleLocationSelect = useCallback((location: Location, source: 'map_click' | 'list_item' | 'search_result' = 'map_click') => {
    setSelectedLocation(location);
    
    // Track marker clicks with enhanced parameters to identify interaction source
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
      
      // For mobile, ensure drawer is shown
      setDrawerState('partial');
    }
  }, [map, isMobile, centerMapOnLocation, setSelectedLocation, setDrawerState]);
  
  // Register global function to access location selection from outside the component
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openLocationDetail = (location: Location, source: 'map_click' | 'list_item' | 'search_result' = 'search_result') => {
        handleLocationSelect(location, source);
      };
    }
    
    // Clean up on unmount
    return () => {
      if (typeof window !== 'undefined') {
        delete window.openLocationDetail;
      }
    };
  }, [handleLocationSelect]);


  
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Enhanced SEO for map */}
      <SEO pageType="map" />

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

            {/* Age Filter - new implementation */}
            <AgeFilterDropdown
              selectedAge={selectedAge}
              onSelectAge={handleAgeSelect}
            />

            {/* Price Filter */}
            <PriceFilterDropdown
              selectedPrice={selectedPrice}
              onSelectPrice={handlePriceSelect}
            />

            {/* Open Now Filter removed */}

            {/* Clear Filters - visible only on desktop when filters are active */}
            {!isMobile && (activeFilters.length > 0 || activeGroups.length > 0 || selectedAge !== null || selectedPrice !== null || openNowFilter) && (
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
      {isMobile && (activeFilters.length > 0 || activeGroups.length > 0 || selectedAge !== null || openNowFilter || selectedPrice !== null) && (
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
              // Check against price filter
              if (selectedPrice !== null) {
                if (selectedPrice === "Free" && location.priceRange !== "Free") {
                  return false;
                } else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
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
            // Check against price filter
            if (selectedPrice !== null) {
              if (selectedPrice === "Free" && location.priceRange !== "Free") {
                return false;
              } else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
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
                if (selectedPrice !== null) {
                  // Handle the "Free" price option
                  if (selectedPrice === "Free" && location.priceRange !== "Free") {
                    return false;
                  }
                  // Handle the other price options (€, €€, €€€)
                  else if (selectedPrice !== "Free" && location.priceRange !== selectedPrice) {
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
            , [locations, activeFilters, selectedAge, openNowFilter, selectedPrice, selectedLocation, hoveredLocation, getMarkerIcon, handleLocationSelect, isMobile, setDrawerState, setHoveredLocation, getZIndexValue])}

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
              drawerLocations={drawerLocations} /* New prop for drawer-specific locations */
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
                // Simply re-center the map on the user's location from context
                centerMapOnLocation(userLocation, 'initial-load');
                console.log('Re-centered map on user location from context');
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
      

    </div>
  );
};

export default MapComponent;