import React from 'react';
import { Link } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';
import SearchBar from '../Search/SearchBar';
import { Location, ActivityType } from '../../types/location';
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';
import { NewsletterButton } from '../Newsletter';
import SuggestActivityButton from '../SuggestActivity/SuggestActivityButton';

interface HeaderProps {
  onNewsletterClick?: () => void;
  onSuggestActivityClick?: () => void;
  locations?: Location[];
  onLocationSelect?: (location: Location, index: number) => void;
  activeFilters?: ActivityType[];
  selectedAge?: number | null;
}

const Header: React.FC<HeaderProps> = ({
  onNewsletterClick = () => {},
  onSuggestActivityClick = () => {},
  locations = [],
  onLocationSelect,
  activeFilters = [],
  selectedAge = null
}) => {
  const { isMobile } = useMobile();

  return (
    <header
      className={`bg-white shadow-md z-header ${isMobile ? 'fixed top-0 left-0 right-0 w-full' : 'relative'}`}
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
        position: isMobile ? 'fixed' : 'relative',
        zIndex: 100 // Ensure header is above map
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="relative inline-flex items-baseline">
            {/* Main logo text - smaller on mobile when we have search */}
            <span className={`font-logo ${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-blue-500`}>Pame</span>
            
            {/* Sub-brand text - smaller on mobile when we have search */}
            <span className={`font-logo ${isMobile ? 'text-2xl' : 'text-3xl'} font-semibold text-orange-500`}>Kids</span>
          </Link>

          <div className="flex items-center space-x-3">
            {/* SearchBar component with styling matching the other buttons */}
            <div className="search-button-wrapper">
              <SearchBar
                locations={locations}
                activityConfig={ACTIVITY_CATEGORIES}
                onLocationSelect={onLocationSelect}
                activeFilters={activeFilters}
                selectedAge={selectedAge}
                expandedByDefault={!isMobile}
                headerMode={true}
                placeholder="Search activities..."
              />
            </div>
            
            {/* Use the original button components */}
            <NewsletterButton onClick={onNewsletterClick} />
            <SuggestActivityButton onClick={onSuggestActivityClick} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;