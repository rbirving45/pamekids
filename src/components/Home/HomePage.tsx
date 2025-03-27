import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';
import { Search, Tent, BookOpen, Trees, Home, Trophy, Popcorn, Leaf, UtensilsCrossed, Hotel, Sparkles } from 'lucide-react';
// Import modal components from existing app
import { NewsletterButton, NewsletterModal } from '../Newsletter';
import SuggestActivityButton from '../SuggestActivity/SuggestActivityButton';
import SuggestActivityModal from '../SuggestActivity/SuggestActivityModal';
// Import metadata for activity types
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';

// Extend the ACTIVITY_CATEGORIES with icons for the homepage
const activityConfig = {
  'indoor-play': { ...ACTIVITY_CATEGORIES['indoor-play'], icon: '🏠' },
  'outdoor-play': { ...ACTIVITY_CATEGORIES['outdoor-play'], icon: '🌳' },
  'sports': { ...ACTIVITY_CATEGORIES['sports'], icon: '⚽' },
  'arts': { ...ACTIVITY_CATEGORIES['arts'], icon: '🎨' },
  'music': { ...ACTIVITY_CATEGORIES['music'], icon: '🎵' },
  'education': { ...ACTIVITY_CATEGORIES['education'], icon: '📚' },
  'entertainment': { ...ACTIVITY_CATEGORIES['entertainment'], icon: '🎪' }
};

// Main category buttons for the hero section
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
  { id: 'free-activities', name: 'Free Activities', icon: Sparkles, color: '#E893B2' } // Special filter for free activities
];

const HomePage: React.FC = () => {
  const { isMobile } = useMobile();
  const [newsLetterOpen, setNewsLetterOpen] = useState(false);
  const [suggestActivityOpen, setSuggestActivityOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
            to="/"
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
            {/* Featured Card 1 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🎨</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['arts'].color}20`,
                      color: activityConfig['arts'].color
                    }}
                  >
                    Arts
                  </span>
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['education'].color}20`,
                      color: activityConfig['education'].color
                    }}
                  >
                    Education
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Athens Art Workshop for Kids</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 6-12 • Central Athens</p>
                <p className="text-sm text-gray-700 mb-4">Creative workshops where children learn various art techniques in a fun environment.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
            
            {/* Featured Card 2 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🏊</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['sports'].color}20`,
                      color: activityConfig['sports'].color
                    }}
                  >
                    Sports
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Summer Swimming Classes</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 3-16 • Multiple Locations</p>
                <p className="text-sm text-gray-700 mb-4">Professional swimming instruction for kids of all skill levels.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
            
            {/* Featured Card 3 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🎵</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['music'].color}20`,
                      color: activityConfig['music'].color
                    }}
                  >
                    Music
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Kid's Music Academy</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 4-14 • Kolonaki</p>
                <p className="text-sm text-gray-700 mb-4">Instrument lessons and music theory for children in a supportive environment.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Content section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-2xl font-bold text-blue-500 mb-6">Free Activities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Featured Card 1 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🎨</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['arts'].color}20`,
                      color: activityConfig['arts'].color
                    }}
                  >
                    Arts
                  </span>
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['education'].color}20`,
                      color: activityConfig['education'].color
                    }}
                  >
                    Education
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Athens Art Workshop for Kids</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 6-12 • Central Athens</p>
                <p className="text-sm text-gray-700 mb-4">Creative workshops where children learn various art techniques in a fun environment.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
            
            {/* Featured Card 2 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🏊</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['sports'].color}20`,
                      color: activityConfig['sports'].color
                    }}
                  >
                    Sports
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Summer Swimming Classes</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 3-16 • Multiple Locations</p>
                <p className="text-sm text-gray-700 mb-4">Professional swimming instruction for kids of all skill levels.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
            
            {/* Featured Card 3 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200">
                {/* Image placeholder */}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🎵</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${activityConfig['music'].color}20`,
                      color: activityConfig['music'].color
                    }}
                  >
                    Music
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Kid's Music Academy</h3>
                <p className="text-sm text-gray-600 mb-2">Ages 4-14 • Kolonaki</p>
                <p className="text-sm text-gray-700 mb-4">Instrument lessons and music theory for children in a supportive environment.</p>
                <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </Link>
              </div>
            </div>
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