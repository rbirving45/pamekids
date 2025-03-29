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
        position: isMobile ? 'fixed' : 'relative'
        // Using z-header class instead of inline z-index
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 relative">
          {/* Left side: Search */}
          <div className={`absolute ${isMobile ? 'left-1' : 'left-4 sm:left-6 lg:left-8'} z-search-container flex items-center`}>
            <div className="search-button-wrapper">
              <SearchBar
                locations={locations}
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
          
          {/* Center: Logo - centered regardless of search state */}
          <div className="flex-1 flex justify-center">
            <Link to="/" className="relative inline-flex items-baseline">
              {/* Main logo text - smaller on mobile when we have search */}
              <span className={`font-logo ${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-blue-500`}>Pame</span>
              
              {/* Sub-brand text - smaller on mobile when we have search */}
              <span className={`font-logo ${isMobile ? 'text-xl' : 'text-3xl'} font-semibold text-orange-500`}>Kids</span>
            </Link>
          </div>
          
          {/* Right side: Buttons */}
          <div className={`absolute ${isMobile ? 'right-0 -mr-1' : 'right-4 sm:right-6 lg:right-8'} flex items-center ${isMobile ? 'space-x-1' : 'space-x-4'}`}>
            {/* Pass mobile context to buttons for responsive sizing */}
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