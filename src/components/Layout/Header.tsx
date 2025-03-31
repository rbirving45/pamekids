import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';
import { useLocations } from '../../contexts/LocationsContext';
import SearchBar from '../Search/SearchBar';
import { Location, ActivityType } from '../../types/location';
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';
import { NewsletterButton } from '../Newsletter';
import SuggestActivityButton from '../SuggestActivity/SuggestActivityButton';

interface HeaderProps {
  onNewsletterClick?: () => void;
  onSuggestActivityClick?: () => void;
  locations?: Location[]; // Keep for backward compatibility, but we'll use context
  onLocationSelect?: (location: Location, index: number) => void;
  activeFilters?: ActivityType[];
  selectedAge?: number | null;
}

const Header: React.FC<HeaderProps> = ({
  onNewsletterClick = () => {},
  onSuggestActivityClick = () => {},
  locations: locationsProp = [], // Renamed to avoid confusion
  onLocationSelect,
  activeFilters = [],
  selectedAge = null
}) => {
  const { isMobile } = useMobile();
  const { allLocations } = useLocations(); // Get locations from context
  const searchRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [logoPosition, setLogoPosition] = useState<number | null>(null);
  
  // Calculate the logo's position when on mobile
  useEffect(() => {
    if (isMobile) {
      const calculateLogoPosition = () => {
        if (searchRef.current && buttonsRef.current) {
          // Get the right edge of the search and left edge of the buttons
          const searchRect = searchRef.current.getBoundingClientRect();
          const buttonsRect = buttonsRef.current.getBoundingClientRect();
          
          // Calculate the center point between them
          const searchRightEdge = searchRect.right;
          const buttonsLeftEdge = buttonsRect.left;
          const centerPoint = searchRightEdge + ((buttonsLeftEdge - searchRightEdge) / 2);
          
          // Calculate the offset from window center
          const windowCenter = window.innerWidth / 2;
          const offsetFromCenter = centerPoint - windowCenter;
          
          setLogoPosition(offsetFromCenter);
        }
      };
      
      calculateLogoPosition();
      // Recalculate if window is resized
      window.addEventListener('resize', calculateLogoPosition);
      return () => window.removeEventListener('resize', calculateLogoPosition);
    } else {
      setLogoPosition(null);
    }
  }, [isMobile]);

  return (
    <header
      className={`bg-white shadow-md z-header w-full`}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      style={{
        touchAction: 'none',
        pointerEvents: 'auto',
        position: isMobile ? 'fixed' : 'relative'
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 relative">
          {/* Left side: Search - keep tight to the left edge */}
          <div
            ref={searchRef}
            className={`absolute ${isMobile ? 'left-1' : 'left-4 sm:left-6 lg:left-8'} z-search-container flex items-center`}
          >
            <div className="search-button-wrapper">
              <SearchBar
                locations={allLocations}
                activityConfig={ACTIVITY_CATEGORIES}
                onLocationSelect={onLocationSelect}
                activeFilters={activeFilters}
                selectedAge={selectedAge}
                expandedByDefault={false}
                headerMode={true}
                placeholder="Search activities..."
              />
            </div>
          </div>
          
          {/* Center: Logo - with dynamic position adjustment on mobile */}
          <div
            className="flex-1 flex justify-center"
            style={isMobile && logoPosition !== null ? {
              transform: `translateX(${logoPosition}px)`
            } : {}}
          >
            <Link to="/" className="relative inline-flex items-baseline">
              <span className={`font-logo ${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-blue-500`}>Pame</span>
              <span className={`font-logo ${isMobile ? 'text-xl' : 'text-3xl'} font-semibold text-orange-500`}>Kids</span>
            </Link>
          </div>
          
          {/* Right side: Buttons - keep tight to the right edge */}
          <div
            ref={buttonsRef}
            className={`absolute ${isMobile ? 'right-0 -mr-1' : 'right-4 sm:right-6 lg:right-8'} flex items-center ${isMobile ? 'space-x-1' : 'space-x-4'}`}
          >
            <div className={isMobile ? 'scale-75 origin-right' : ''}>
              <NewsletterButton onClick={onNewsletterClick} />
            </div>
            <div className={isMobile ? 'scale-75 origin-left' : ''}>
              <SuggestActivityButton onClick={onSuggestActivityClick} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;