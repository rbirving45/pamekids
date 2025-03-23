import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Layout/Header';
import { useMobile } from '../../contexts/MobileContext';
import { Search } from 'lucide-react';

// Use the same activity config from the Map component
const activityConfig = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444', icon: '🏠' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679', icon: '🌳' },
  'sports': { name: 'Sports', color: '#FF8C00', icon: '⚽' },
  'arts': { name: 'Arts', color: '#9C27B0', icon: '🎨' },
  'music': { name: 'Music', color: '#3F51B5', icon: '🎵' },
  'education': { name: 'Education', color: '#4285F4', icon: '📚' },
  'entertainment': { name: 'Entertainment', color: '#FFB300', icon: '🎪' }
};

const HomePage: React.FC = () => {
  const { isMobile } = useMobile();
  const [newsLetterOpen, setNewsLetterOpen] = useState(false);
  const [suggestActivityOpen, setSuggestActivityOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="homepage-container min-h-screen flex flex-col">
      {/* Reuse the Header component */}
      <Header
        onNewsletterClick={() => setNewsLetterOpen(true)}
        onSuggestActivityClick={() => setSuggestActivityOpen(true)}
      />
      
      {/* Search Bar - styled similarly to the app's existing search */}
      <div className={`bg-white p-4 shadow-sm ${isMobile ? 'mt-16' : ''}`}>
        <div className="max-w-3xl mx-auto flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <Search size={20} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search for activities in Athens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-sm font-medium"
          >
            Search
          </Link>
        </div>
      </div>
      
      {/* Hero section */}
      <section className="bg-blue-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
            Discover the best kids' activities in Athens
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Find perfect places for children of all ages
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Explore Map
          </Link>
        </div>
      </section>
      
      {/* Activity Types section - styled similarly to filter buttons */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Browse by Activity Type</h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {Object.entries(activityConfig).map(([type, config]) => (
              <Link
                key={type}
                to={`/?filter=${type}`}
                style={{
                  backgroundColor: `${config.color}15`,
                  color: config.color,
                  borderWidth: '1.5px',
                  borderColor: config.color,
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium transition-colors hover:opacity-90"
              >
                <span className="text-2xl">{config.icon}</span>
                <span>{config.name}</span>
              </Link>
            ))}
          </div>
          
          {/* Age filters - similar to the app's age filter */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Popular Age Groups</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map(age => (
                <Link
                  key={age}
                  to={`/?age=${age}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-sm font-medium transition-colors"
                >
                  {age === 0 ? 'Infants' : age < 2 ? `${age} year` : `${age} years`}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Content section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Featured Activities</h2>
          
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
      
      {/* TODO: Add modal components for newsletter and suggest activity */}
    </div>
  );
};

export default HomePage;