import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';
import { Search, Tent, BookOpen, Trees, Home, Trophy, Popcorn, Leaf, UtensilsCrossed, Hotel, Sparkles } from 'lucide-react';
// Import modal components from existing app
import { NewsletterButton, NewsletterModal } from '../Newsletter';
import SuggestActivityButton from '../SuggestActivity/SuggestActivityButton';
import SuggestActivityModal from '../SuggestActivity/SuggestActivityModal';
// Import metadata for activity types
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';
// Import firebase services and types
import { getLocations } from '../../utils/firebase-service';
import { Location } from '../../types/location';
// Import the new FeaturedLocationTile component
import FeaturedLocationTile from './FeaturedLocationTile';

// Main categories with icons for the homepage
const mainCategories = [
  { id: 'camps', name: 'Camps', icon: Tent, color: '#F9D056' },
  { id: 'learning', name: 'Learning', icon: BookOpen, color: '#8BC34A' },
  { id: 'outdoor-play', name: 'Outdoor Play', icon: Trees, color: '#4F6490' },
  { id: 'indoor-play', name: 'Indoor Play', icon: Home, color: '#E893B2' },
  { id: 'sports', name: 'Sports', icon: Trophy, color: '#6BAAD4' },
  { id: 'entertainment', name: 'Entertainment', icon: Popcorn, color: '#8BC34A' },
  { id: 'nature', name: 'Nature', icon: Leaf, color: '#4F6490' },
  { id: 'food', name: 'Food', icon: UtensilsCrossed, color: '#6BAAD4' },
  { id: 'accommodation', name: 'Accommodation', icon: Hotel, color: '#F9D056' },
  { id: 'free-activities', name: 'Free Activities', icon: Sparkles, color: '#E893B2' }
];

// Main category buttons defined above

const HomePage: React.FC = () => {
  const { isMobile } = useMobile();
  const navigate = useNavigate();
  const [newsLetterOpen, setNewsLetterOpen] = useState(false);
  const [suggestActivityOpen, setSuggestActivityOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [featuredLocations, setFeaturedLocations] = useState<Location[]>([]);
  const [freeActivities, setFreeActivities] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations from Firestore
  useEffect(() => {
    const fetchLocationsData = async () => {
      try {
        setIsLoading(true);
        const locationsData = await getLocations();
        setAllLocations(locationsData);
        
        // Filter for featured locations (up to 3)
        const featured = locationsData
          .filter(loc => loc.featured === true)
          .slice(0, 3);
          
        // If we don't have enough featured locations, add some more based on rating
        if (featured.length < 3) {
          const highestRated = locationsData
            .filter(loc => !loc.featured) // Exclude already featured locations
            .filter(loc => loc.placeData?.rating && loc.placeData.rating >= 4.5) // Only high ratings
            .filter(loc => loc.placeData?.storedPhotoUrls?.length) // Only locations with images
            .sort((a, b) => (b.placeData?.rating || 0) - (a.placeData?.rating || 0)) // Sort by rating
            .slice(0, 3 - featured.length); // Take only what we need
            
          setFeaturedLocations([...featured, ...highestRated]);
        } else {
          setFeaturedLocations(featured);
        }
        
        // Get free activities
        const free = locationsData
          .filter(loc => loc.priceRange?.toLowerCase().includes('free'))
          .slice(0, 3);
          
        setFreeActivities(free);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load activities. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchLocationsData();
  }, []);
  
  // Handle featured location selection
  const handleLocationSelect = (locationId: string) => {
    // Navigate to map view with selected location
    navigate(`/?locationId=${locationId}`);
  };
  
  return (
    <div className="homepage-container min-h-screen flex flex-col">
      {/* Sticky header with styling to match main app */}
      <header
        className={`bg-white shadow-md z-header ${isMobile ? 'fixed top-0 left-0 right-0' : 'relative'}`}
        style={{
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          zIndex: 100 // Use z-index value from z-index.css
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative inline-flex items-baseline">
              {/* Main logo text */}
              <span className="font-logo text-4xl md:text-4xl font-bold text-blue-500">Pame</span>
              
              {/* Sub-brand text */}
              <span className="font-logo text-3xl md:text-3xl font-semibold text-orange-500">Kids</span>
            </div>
            <div className="flex items-center space-x-3">
              <NewsletterButton onClick={() => setNewsLetterOpen(true)} />
              <SuggestActivityButton onClick={() => setSuggestActivityOpen(true)} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Search Bar - styled to match main app search */}
      <div className={`bg-white p-4 shadow-sm z-filter-bar ${isMobile ? 'mt-16' : ''}`} style={{ zIndex: 110 }}>
        <div className="max-w-3xl mx-auto flex items-center gap-2 rounded-lg">
          <div className="relative z-search-container flex-1">
            <div className="flex items-center w-full">
              <div className="p-2 rounded-full bg-gray-100">
                <Search size={20} className="text-gray-600" />
              </div>
              
              <div className="flex-1 ml-2 w-full">
                <input
                  type="text"
                  placeholder="Search for activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <Link
            to={`/?search=${encodeURIComponent(searchTerm)}`}
            className="bg-blue-500 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Search
          </Link>
        </div>
      </div>
      
      {/* Hero section */}
      <section className="bg-blue-50 py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-blue-500 mb-6">
            Discover the best activities for kids in your area
          </h1>
          {/* Mobile-optimized scrollable grid for main category buttons */}
          <div
            className={`${isMobile
              ? 'grid grid-rows-2 grid-flow-col auto-cols-[38%] gap-4 overflow-x-auto snap-x snap-mandatory pb-6 px-2 no-scrollbar'
              : 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-10 px-4'}
              max-w-5xl mx-auto`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {mainCategories.map(category => (
              <div
                key={category.id}
                className={`flex items-center justify-center ${isMobile ? 'snap-start' : ''}`}
              >
              <div className="flex flex-col items-center">
                <Link
                  to={`/?filter=${category.id}`}
                  className={`flex items-center justify-center transition-transform hover:scale-105 ${isMobile ? 'w-20 h-20' : 'w-28 h-28'}`}
                  style={{
                    backgroundColor: category.color,
                    borderRadius: '50%',
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.08)',
                    touchAction: 'manipulation'
                  }}
                >
                  <div className="text-white">
                    {React.createElement(category.icon, {
                      size: isMobile ? 40 : 54,
                      strokeWidth: 1.5
                    })}
                  </div>
                </Link>
                <span className={`font-bold text-blue-800 text-center mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}>{category.name}</span>
              </div>
              </div>
            ))}
          </div>
        </div>
      </section>
            
      {/* Featured Content section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-2xl font-bold text-blue-500 mb-6">Featured Activities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeleton for featured locations
              Array(3).fill(0).map((_, i) => (
                <div key={`skeleton-${i}`} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="h-6 w-3/4 bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 mb-4 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : error ? (
              // Error state
              <div className="col-span-3 p-6 text-center">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            ) : featuredLocations.length === 0 ? (
              // Empty state
              <div className="col-span-3 p-6 text-center text-gray-500">
                <p>No featured activities available at this time.</p>
              </div>
            ) : (
              // Render actual featured locations
              featuredLocations.map(location => (
                <FeaturedLocationTile
                  key={location.id}
                  location={location}
                  activityConfig={ACTIVITY_CATEGORIES}
                  onSelect={() => handleLocationSelect(location.id)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Free Activities section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-2xl font-bold text-blue-500 mb-6">Free Activities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeleton for free activities
              Array(3).fill(0).map((_, i) => (
                <div key={`skeleton-free-${i}`} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="h-6 w-3/4 bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 mb-2 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 mb-4 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : error ? (
              // Error state
              <div className="col-span-3 p-6 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : freeActivities.length === 0 ? (
              // Empty state - fetch some standard activities if no free ones
              allLocations.slice(0, 3).map(location => (
                <FeaturedLocationTile
                  key={location.id}
                  location={location}
                  activityConfig={ACTIVITY_CATEGORIES}
                  onSelect={() => handleLocationSelect(location.id)}
                />
              ))
            ) : (
              // Render actual free activities
              freeActivities.map(location => (
                <FeaturedLocationTile
                  key={location.id}
                  location={location}
                  activityConfig={ACTIVITY_CATEGORIES}
                  onSelect={() => handleLocationSelect(location.id)}
                />
              ))
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-block bg-white hover:bg-gray-50 text-blue-600 font-medium py-2 px-6 rounded-lg border border-blue-600 transition duration-200"
            >
              View All Activities
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer section */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-baseline">
                <span className="font-logo text-3xl font-bold text-blue-400">Pame</span>
                <span className="font-logo text-2xl font-semibold text-orange-400">Kids</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">© 2025 PameKids. All rights reserved.</p>
            </div>
            
            <div className="flex gap-6">
              <Link to="/" className="text-gray-300 hover:text-white">About</Link>
              <Link to="/" className="text-gray-300 hover:text-white">Contact</Link>
              <Link to="/" className="text-gray-300 hover:text-white">Privacy</Link>
              <Link to="/" className="text-gray-300 hover:text-white">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Add modal components for newsletter and suggest activity */}
      <NewsletterModal
        isOpen={newsLetterOpen}
        onClose={() => setNewsLetterOpen(false)}
      />
      
      <SuggestActivityModal
        isOpen={suggestActivityOpen}
        onClose={() => setSuggestActivityOpen(false)}
        activityTypes={ACTIVITY_CATEGORIES}
      />
    </div>
  );
};

export default HomePage;