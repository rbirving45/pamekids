import React, { useState, useRef, useEffect } from 'react';

interface Item {
  id: string;
  name: string;
  [key: string]: any;
}

interface SearchableDropdownProps {
  items: Item[];
  placeholder?: string;
  value: string;
  onChange: (value: string | null) => void;
  label?: string;
  className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  items,
  placeholder = 'Search...',
  value,
  onChange,
  label,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Item[]>(items);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected item based on value
  const selectedItem = items.find(item => item.id === value);

  // Filter items based on search term and sort alphabetically
  useEffect(() => {
    // Helper function to sort items alphabetically by name
    const sortAlphabetically = (a: Item, b: Item) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      
    if (searchTerm.trim() === '') {
      // Sort all items alphabetically
      const sortedItems = [...items].sort(sortAlphabetically);
      setFilteredItems(sortedItems);
    } else {
      // Filter based on search, then sort alphabetically
      const filtered = items
        .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort(sortAlphabetically);
        
      setFilteredItems(filtered);
    }
    // Reset highlighted index when search results change
    setHighlightedIndex(-1);
  }, [searchTerm, items]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        setIsOpen(true);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        event.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        event.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          handleItemSelect(filteredItems[highlightedIndex].id);
          event.preventDefault();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  // Handle item selection
  const handleItemSelect = (itemId: string | null) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchTerm('');
    
    // Remove focus from input to show the selected value clearly
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Focus scroll on highlighted item
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      const highlightedElement = document.getElementById(`dropdown-item-${highlightedIndex}`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full p-2 border rounded-md ${isOpen ? 'rounded-b-none' : ''}`}
          // Only show placeholder when there's no selected item
          placeholder={!selectedItem || isOpen ? placeholder : ''}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onClick={() => setIsOpen(true)}
          onFocus={() => {
            if (searchTerm === '' && selectedItem) {
              // Clear the value on focus to allow searching
              setSearchTerm('');
            }
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls="dropdown-list"
          aria-haspopup="listbox"
        />
        
        {/* Show the selected item name when not searching */}
        {selectedItem && searchTerm === '' && !isOpen && (
          <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-800">
            {selectedItem.name}
          </div>
        )}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-2"
          onClick={() => setIsOpen(prev => !prev)}
          tabIndex={-1}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute z-10 w-full mt-0 bg-white border border-t-0 border-gray-300 rounded-b-md shadow-lg max-h-60 overflow-y-auto"
          id="dropdown-list"
        >
          {filteredItems.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No results found</div>
          ) : (
            <ul role="listbox">
              <li
                role="option"
                aria-selected={value === ''}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800 border-b border-gray-100"
                onClick={() => handleItemSelect(null)}
              >
                -- Clear selection --
              </li>
              {filteredItems.map((item, index) => (
                <li
                  key={item.id}
                  id={`dropdown-item-${index}`}
                  role="option"
                  aria-selected={item.id === value}
                  className={`p-2 cursor-pointer text-sm ${
                    index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                  } ${item.id === value ? 'bg-blue-50' : ''}`}
                  onClick={() => handleItemSelect(item.id)}
                >
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;