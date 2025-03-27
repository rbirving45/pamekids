import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ActivityType } from '../../types/location';
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';
import { useTouch } from '../../contexts/TouchContext';
import { useMobile } from '../../contexts/MobileContext';

interface GroupFilterDropdownProps {
  groupKey: string;
  groupName: string;
  groupColor: string;
  groupTypes: string[];
  activeFilters: ActivityType[];
  activeGroups: string[];
  onToggleGroup: (groupKey: string) => void;
  onToggleFilter: (type: ActivityType) => void;
}

const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  groupKey,
  groupName,
  groupColor,
  groupTypes,
  activeFilters,
  activeGroups,
  onToggleGroup,
  onToggleFilter
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setFilterDropdownOpen } = useTouch();
  const { isMobile } = useMobile();

  // Determine group status and count of active types
  const isGroupActive = activeGroups.includes(groupKey);
  const activeTypesInGroup = groupTypes.filter(type =>
    activeFilters.includes(type as ActivityType)
  ).length;
  const isPartiallyActive = !isGroupActive && activeTypesInGroup > 0;
  
  // Display text with count if partially selected
  const displayText = isGroupActive
    ? `${groupName} (${activeTypesInGroup})`
    : groupName;

  // Handle clicking on the main part of the button (toggles group)
  const handleMainButtonClick = (e: React.MouseEvent) => {
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
      // Otherwise, toggle the group selection
      e.stopPropagation();
      onToggleGroup(groupKey);
    }
  };

  // Handle clicking on an individual type
  const handleTypeClick = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    onToggleFilter(type as ActivityType);
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
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
        onClick={handleMainButtonClick}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isGroupActive
            ? groupColor
            : isPartiallyActive
              ? `${groupColor}40` // 25% opacity for partially active
              : 'rgb(243 244 246)',
          color: isGroupActive
            ? 'white'
            : isPartiallyActive
              ? groupColor
              : 'rgb(55 65 81)',
          borderWidth: '1.5px',
          borderColor: groupColor,
          touchAction: 'manipulation', // Optimize for tap/click
        }}
        className="snap-start flex items-center justify-between gap-1 flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-90"
      >
        <span className="whitespace-nowrap pr-1">{displayText}</span>
        
        {/* Chevron with subtle separator */}
        {groupTypes.length > 0 && (
          <div
            className="chevron-area flex items-center"
            style={{
              borderLeft: isGroupActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.1)',
              paddingLeft: '4px',
              marginLeft: '2px'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {/* Dropdown menu - rendered with portal to ensure it's not clipped */}
      {isExpanded && groupTypes.length > 0 && document.body && createPortal(
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
          {/* Group select all option */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleGroup(groupKey);
              // Don't close dropdown to allow further refinement
            }}
            className="w-full px-3 py-2 text-left text-sm font-medium border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between"
            style={{
              color: isGroupActive ? groupColor : 'rgb(55 65 81)',
            }}
          >
            <span className="mr-2">Select All {groupTypes.length} Types</span>
            {isGroupActive && (
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
          
          {/* Individual types */}
          <div className="mt-1">
            {groupTypes.map((type) => (
              <button
                key={type}
                onClick={(e) => handleTypeClick(e, type)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="mr-2">{ACTIVITY_CATEGORIES[type as ActivityType]?.name || type}</span>
                {activeFilters.includes(type as ActivityType) && (
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

export default GroupFilterDropdown;