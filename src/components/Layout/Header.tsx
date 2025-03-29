import React from 'react';
import { Link } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';

interface HeaderProps {
  onNewsletterClick?: () => void;
  onSuggestActivityClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onNewsletterClick = () => {},
  onSuggestActivityClick = () => {}
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
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="relative inline-flex items-baseline">
            {/* Main logo text */}
            <span className="font-logo text-4xl md:text-4xl font-bold text-blue-500">Pame</span>
            
            {/* Sub-brand text */}
            <span className="font-logo text-3xl md:text-3xl font-semibold text-orange-500">Kids</span>
          </Link>

          <div className="flex items-center space-x-3">
            {/* Newsletter Button */}
            <button
              onClick={onNewsletterClick}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Newsletter
            </button>
            
            {/* Suggest Activity Button */}
            <button
              onClick={onSuggestActivityClick}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Suggest Activity
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;