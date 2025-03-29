import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTouch } from '../../contexts/TouchContext';
import { useMobile } from '../../contexts/MobileContext';
import { ChevronDown } from 'lucide-react';

// Define the price options
export type PriceOption = 'Free' | '€' | '€€' | '€€€' | null;

interface PriceFilterDropdownProps {
  selectedPrice: PriceOption;
  onSelectPrice: (price: PriceOption) => void;
}

const PriceFilterDropdown: React.FC<PriceFilterDropdownProps> = ({
  selectedPrice,
  onSelectPrice
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setFilterDropdownOpen } = useTouch();
  const { isMobile } = useMobile();

  // Price options
  const priceOptions: PriceOption[] = ['Free', '€', '€€', '€€€'];

  // Handle clicking on the main button
  const handleButtonClick = (e: React.MouseEvent) => {
    // Check if click was on the chevron area
    const target = e.target as HTMLElement;
    if (target.closest('.chevron-area')) {
      // If clicked on chevron, toggle dropdown without affecting selection
      e.stopPropagation();
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);
      
      // Only update filter dropdown state on mobile
      if (isMobile) {
        setFilterDropdownOpen(newExpandedState);
      }
    } else {
      // Otherwise, toggle the dropdown
      e.stopPropagation();
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);
      
      // Only update filter dropdown state on mobile
      if (isMobile) {
        setFilterDropdownOpen(newExpandedState);
      }
    }
  };

  // Handle clicking on a price option
  const handlePriceClick = (e: React.MouseEvent, price: PriceOption) => {
    e.stopPropagation();
    onSelectPrice(price);
    setIsExpanded(false);
    
    // Update filter dropdown state in TouchContext
    if (isMobile) {
      setFilterDropdownOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        
        // Only update filter dropdown state on mobile
        if (isMobile) {
          setFilterDropdownOpen(false);
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Ensure that clicking outside a filter dropdown doesn't inadvertently trigger map or drawer interactions
      const preventMapInteraction = (e: Event) => {
        if (!buttonRef.current?.contains(e.target as Node) &&
            !dropdownRef.current?.contains(e.target as Node)) {
          e.stopPropagation();
        }
      };
      
      // Add capture phase listener to intercept events before they reach the map
      document.addEventListener('touchstart', preventMapInteraction, true);
      document.addEventListener('touchmove', preventMapInteraction, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', preventMapInteraction, true);
        document.removeEventListener('touchmove', preventMapInteraction, true);
      };
    } else {
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded, isMobile, setFilterDropdownOpen]);
  
  // Get dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 5, // Added small gap
      left: rect.left + window.scrollX
    };
  };

  return (
    <div className="relative" onTouchStart={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          backgroundColor: selectedPrice !== null ? '#3B82F6' : 'rgb(243 244 246)',
          color: selectedPrice !== null ? 'white' : 'rgb(55 65 81)',
          borderWidth: '1.5px',
          borderColor: selectedPrice !== null ? '#3B82F6' : 'transparent',
          touchAction: 'manipulation', // Optimize for tap/click
        }}
        className="snap-start flex items-center justify-between gap-1 flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-90"
      >
        <span className="whitespace-nowrap pr-1">
          {selectedPrice !== null ? `Price: ${selectedPrice}` : 'Price'}
        </span>
        
        {/* Chevron with subtle separator */}
        <div
          className="chevron-area flex items-center"
          style={{
            borderLeft: selectedPrice !== null ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.1)',
            paddingLeft: '4px',
            marginLeft: '2px'
          }}
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown menu - rendered with portal to ensure it's not clipped */}
      {isExpanded && document.body && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg py-1 min-w-max border border-gray-200"
          style={{
            ...getDropdownPosition(),
            zIndex: 9999,
            maxHeight: '60vh',
            overflowY: 'auto',
            minWidth: buttonRef.current ? buttonRef.current.offsetWidth : 100
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Any Price option */}
          <button
            onClick={(e) => handlePriceClick(e, null)}
            className={`w-full px-3 py-2 text-left text-sm font-medium border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between ${
              selectedPrice === null ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <span className="mr-2">Any Price</span>
            {selectedPrice === null && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          
          {/* Individual price options */}
          <div className="mt-1">
            {priceOptions.map((price) => (
              <button
                key={price as string}
                onClick={(e) => handlePriceClick(e, price)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  selectedPrice === price ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <span className="mr-2">{price}</span>
                {selectedPrice === price && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          
          {/* Close button */}
          <div className="border-t border-gray-100 mt-1 pt-1 px-2">
            <button
              onClick={() => {
                setIsExpanded(false);
                // Only update filter dropdown state on mobile
                if (isMobile) {
                  setFilterDropdownOpen(false);
                }
              }}
              className="w-full py-1.5 text-sm text-center text-gray-500 hover:bg-gray-50 rounded"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PriceFilterDropdown;