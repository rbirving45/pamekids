import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useMobile } from '../../contexts/MobileContext';
import { Location, ActivityType } from '../../types/location';
import { performEnhancedSearch, SearchMatch } from '../../utils/search-utils';
import { trackSearchQuery, trackSearchResultClick } from '../../utils/analytics';

interface SearchBarProps {
  locations: Location[];
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  onLocationSelect?: (location: Location, index: number) => void;
  className?: string;
  placeholder?: string;
  activeFilters?: ActivityType[];
  selectedAge?: number | null;
  expandedByDefault?: boolean;
  headerMode?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  locations = [],
  activityConfig,
  onLocationSelect,
  className = '',
  placeholder = 'Search by name, activity, age...',
  activeFilters = [],
  selectedAge = null,
  expandedByDefault = false,
  headerMode = false
}) => {
  const { isMobile } = useMobile();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(expandedByDefault || !isMobile);
  const searchRef = useRef<HTMLDivElement>(null);
  const lastTrackedSearchTermRef = useRef<string>("");

  // Handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Check if the click was on a search result item
        const clickedOnSearchResult = (event.target as Element)?.closest('[data-search-result]');
        if (!clickedOnSearchResult) {
          setSearchExpanded(expandedByDefault || !isMobile);
          // Only clear results if we're actually closing the search
          if (isMobile && !expandedByDefault) {
            setSearchResults([]);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, expandedByDefault]);

  // Search logic
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    // Short debounce for UI responsiveness
    const uiDebounceTimeout = setTimeout(() => {
      // Use our enhanced search function that understands activities and ages
      const results = performEnhancedSearch(locations, searchTerm, activityConfig);
      
      // Limit to first 10 results for better performance
      setSearchResults(results.slice(0, 10));
    }, 150); // 150ms debounce for UI updates
    
    // Longer debounce for analytics tracking
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
      }
    }, 1500); // 1.5 second debounce for analytics
    
    return () => {
      clearTimeout(uiDebounceTimeout);
      clearTimeout(analyticsDebounceTimeout);
    };
  }, [searchTerm, locations, activityConfig, activeFilters, selectedAge]);

  // Handle search result selection
  const handleResultSelect = (location: Location, index: number = 0) => {
    // When a user clicks a result, track both the search and the click
    if (searchTerm) {
      // Force immediate tracking of the search term when a result is clicked
      if (searchTerm.trim().length >= 3 && searchTerm !== lastTrackedSearchTermRef.current) {
        // Get fresh results for accurate count
        const results = performEnhancedSearch(locations, searchTerm, activityConfig);
        
        // Track the search immediately
        trackSearchQuery(
          searchTerm,
          results.length,
          activeFilters.length > 0,
          selectedAge !== null
        );
        
        // Update the last tracked search term
        lastTrackedSearchTermRef.current = searchTerm;
      }
      
      // Track the result click
      trackSearchResultClick(
        searchTerm,
        location.name,
        index,
        location.id,
        location.types
      );
    }
    
    // Clear search term after selection
    setSearchTerm('');
    setSearchResults([]);
    setSearchExpanded(expandedByDefault || !isMobile);
    
    // Call the provided onLocationSelect function if available
    if (onLocationSelect) {
      onLocationSelect(location, index);
    } else {
      // Default behavior: navigate to the map view with this location
      navigate(`/?locationId=${location.id}`);
    }
  };

  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      // If we have results, select the first one
      if (searchResults.length > 0) {
        handleResultSelect(searchResults[0].location, 0);
      } else {
        // If no results, just navigate to the search page
        navigate(`/?search=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  // Render search results dropdown using portal to document body
  const renderSearchDropdown = () => {
    if (!searchExpanded || searchResults.length === 0) return null;
    
    // Get position for dropdown from the search reference
    const searchRect = searchRef.current?.getBoundingClientRect();
    if (!searchRect) return null;
    
  // Calculate position with a small offset to prevent input overlap
  // Calculate position with an offset to prevent input overlap
  // Use a larger offset on mobile devices to account for touch targets
  const dropdownOffset = isMobile ? 24 : 8; // 24px for mobile, 8px for desktop
  const dropdownTop = searchRect.bottom + window.scrollY + dropdownOffset;
  
  // For mobile and desktop, align with search field like in Map component
  const dropdownLeft = isMobile && searchExpanded
    ? 0
    : searchRect.left + window.scrollX;
    
    // Determine width - use full screen width on mobile, wider on desktop
    const dropdownWidth = isMobile
      ? '100%'
      : `${Math.min(Math.max(searchRect.width * 1.5, 350), 500)}px`;
    
    // Create portal content - using same styles and structure as the original SearchBar
    const dropdownContent = (
      <div
        className="fixed bg-white rounded-lg shadow-lg overflow-y-auto z-search-dropdown"
        style={{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          width: dropdownWidth,
          maxHeight: '300px',
          // Let the z-search-dropdown class handle the z-index
        }}
      >
        {searchResults.map((result, index) => (
          <button
            key={`${result.location.id}-${result.matchField}-${index}`}
            onClick={() => handleResultSelect(result.location, index)}
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
    
    // Render directly to document body with portal - this breaks out of any stacking context limitations
    return ReactDOM.createPortal(
      dropdownContent,
      document.body
    );
  };

  // EXACTLY match the styles from the existing buttons - matching precise size & color
  const searchButtonClass = headerMode
    ? isMobile || !isMobile
      ? "bg-[#4679ea] hover:bg-[#3a6ad6] text-white rounded-full flex items-center justify-center w-10 h-10 transition-colors" // Exact size and color match
      : "bg-[#4679ea] hover:bg-[#3a6ad6] text-white rounded-full flex items-center justify-center w-10 h-10 transition-colors" // Exact size and color match
    : "p-2 rounded-full bg-gray-100 hover:bg-gray-200"; // Original map search style (non-header mode)

  return (
    <div ref={searchRef} className={`relative z-search-container ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`flex items-center transition-all duration-200 ${
          searchExpanded ?
            (isMobile ? 'fixed top-0 left-0 w-full bg-white h-16 px-4 z-header' : 'flex gap-3') :
            'w-10'
        }`}>
          <button
            type="button"
            onClick={() => {
              setSearchExpanded(!searchExpanded);
            }}
            className={searchButtonClass}
            aria-label={searchExpanded ? "Collapse search" : "Expand search"}
          >
            <Search size={18} className="text-white" strokeWidth={2.5} />
          </button>
          
          {searchExpanded && (
            <div className={`flex-1 transition-all ${isMobile ? 'ml-3 w-full' : 'ml-3 w-80'}`}>
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isMobile ? 'w-full' : 'w-full'} px-4 py-2 rounded-3xl border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#4679ea]`}
                style={{height: '42px'}}
                autoFocus
              />
              
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setSearchExpanded(false)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </form>
      
      {/* Render search results dropdown outside the form */}
      {renderSearchDropdown()}
    </div>
  );
};

export default SearchBar;