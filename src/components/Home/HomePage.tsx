import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMobile } from '../../contexts/MobileContext';
import { Tent, BookOpen, Trees, Home, Trophy, Popcorn, Leaf, UtensilsCrossed, Hotel, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
// Import modal components from existing app
import { NewsletterModal } from '../Newsletter';
import SuggestActivityModal from '../SuggestActivity/SuggestActivityModal';
import Header from '../Layout/Header';
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

// Carousel component for location tiles
const LocationCarousel = ({
 locations,
 activityConfig,
 onSelect,
 isLoading,
 error
}: {
 locations: Location[],
 activityConfig: any,
 onSelect: (id: string) => void,
 isLoading: boolean,
 error: string | null
}) => {
 const carouselRef = useRef<HTMLDivElement>(null);
 const { isMobile } = useMobile();
 const [showLeftArrow, setShowLeftArrow] = useState(false);
 const [showRightArrow, setShowRightArrow] = useState(true);

 // Update arrow visibility on scroll
 const handleScroll = () => {
   if (!carouselRef.current) return;
   
   const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
   const atStart = scrollLeft <= 10;
   const atEnd = scrollLeft + clientWidth >= scrollWidth - 10;
   
   setShowLeftArrow(!atStart);
   setShowRightArrow(!atEnd);
 };

 // Scroll left or right by one tile
 const scroll = (direction: 'left' | 'right') => {
   if (!carouselRef.current) return;
   
   const scrollAmount = isMobile
     ? carouselRef.current.clientWidth * 0.9 // On mobile, scroll by nearly one full tile
     : carouselRef.current.clientWidth / 3; // On desktop, scroll by one third (one card)
   
   const newPosition = direction === 'left'
     ? carouselRef.current.scrollLeft - scrollAmount
     : carouselRef.current.scrollLeft + scrollAmount;
   
   carouselRef.current.scrollTo({
     left: newPosition,
     behavior: 'smooth'
   });
 };

 // Initialize scroll position to show arrows correctly
 useEffect(() => {
   handleScroll();
   
   // Add a resize listener to update arrows
   window.addEventListener('resize', handleScroll);
   return () => window.removeEventListener('resize', handleScroll);
 }, [locations]);
 
 // Skeleton loaders for when data is loading
 if (isLoading) {
   return (
     <div className="overflow-hidden relative">
       <div className="flex space-x-4 overflow-x-scroll no-scrollbar py-2 px-1">
         {Array(9).fill(0).map((_, i) => (
           <div
             key={`skeleton-${i}`}
             className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse flex-shrink-0"
             style={{ width: isMobile ? '90%' : 'calc(33.333% - 12px)' }}
           >
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
         ))}
       </div>
     </div>
   );
 }
 
 // Error display
 if (error) {
   return (
     <div className="p-6 text-center">
       <p className="text-red-500">{error}</p>
       <button
         onClick={() => window.location.reload()}
         className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
       >
         Retry
       </button>
     </div>
   );
 }
 
 // No locations display
 if (locations.length === 0) {
   return (
     <div className="p-6 text-center text-gray-500">
       <p>No locations available at this time.</p>
     </div>
   );
 }
 
 return (
   <div className="relative">
     {/* Left scroll arrow */}
     {showLeftArrow && (
       <button
         onClick={() => scroll('left')}
         className="absolute left-0 top-1/2 -translate-y-1/2 z-carousel-controls bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
         aria-label="Scroll left"
       >
         <ChevronLeft size={24} />
       </button>
     )}
     
     {/* Right scroll arrow */}
     {showRightArrow && (
       <button
         onClick={() => scroll('right')}
         className="absolute right-0 top-1/2 -translate-y-1/2 z-carousel-controls bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
         aria-label="Scroll right"
       >
         <ChevronRight size={24} />
       </button>
     )}
     
     {/* Scroll container */}
     <div
       ref={carouselRef}
       className="flex space-x-4 overflow-x-scroll no-scrollbar py-2 px-1 snap-x"
       onScroll={handleScroll}
     >
       {locations.map(location => (
         <div
           key={location.id}
           className={`flex-shrink-0 snap-start ${isMobile ? 'w-[90%]' : 'w-[calc(33.333%-12px)]'}`}
         >
           <FeaturedLocationTile
             location={location}
             activityConfig={activityConfig}
             onSelect={() => onSelect(location.id)}
           />
         </div>
       ))}
     </div>
   </div>
 );
};

// Main HomePage component
const HomePage: React.FC = () => {
 const { isMobile } = useMobile();
 const navigate = useNavigate();
 const [newsLetterOpen, setNewsLetterOpen] = useState(false);
 const [suggestActivityOpen, setSuggestActivityOpen] = useState(false);
 // Search term is now handled by the SearchBar component
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
       
       // Filter for featured locations (up to 9 now)
       const featured = locationsData
         .filter(loc => loc.featured === true)
         .slice(0, 9);
         
       // If we don't have enough featured locations, add some more based on rating
       if (featured.length < 9) {
         const highestRated = locationsData
           .filter(loc => !loc.featured) // Exclude already featured locations
           .filter(loc => loc.placeData?.rating && loc.placeData.rating >= 4.0) // Only high ratings
           .filter(loc => loc.placeData?.storedPhotoUrls?.length) // Only locations with images
           .sort((a, b) => (b.placeData?.rating || 0) - (a.placeData?.rating || 0)) // Sort by rating
           .slice(0, 9 - featured.length); // Take only what we need
           
         setFeaturedLocations([...featured, ...highestRated]);
       } else {
         setFeaturedLocations(featured);
       }
       
       // Get free activities (up to 9)
       const free = locationsData
         .filter(loc => loc.priceRange?.toLowerCase().includes('free'))
         .slice(0, 9);
       
       // If we don't have enough free activities, add some regular activities
       if (free.length < 9) {
         const additionalActivities = locationsData
           .filter(loc => !free.some(freeItem => freeItem.id === loc.id)) // Exclude already included free activities
           .filter(loc => loc.placeData?.storedPhotoUrls?.length) // Only locations with images
           .slice(0, 9 - free.length);
           
         setFreeActivities([...free, ...additionalActivities]);
       } else {
         setFreeActivities(free);
       }
       
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
     {/* Use the common Header component with fixed position */}
     <div className="fixed top-0 left-0 right-0 z-header w-full">
       <Header
         locations={featuredLocations}
         onNewsletterClick={() => setNewsLetterOpen(true)}
         onSuggestActivityClick={() => setSuggestActivityOpen(true)}
         onLocationSelect={location => handleLocationSelect(location.id)}
       />
     </div>
     
     {/* Add spacing to account for fixed header on both mobile and desktop */}
     <div className="h-16"></div>
     
     {/* Hero section */}
     <section className={`bg-blue-50 ${isMobile ? 'pt-4 pb-4' : 'py-8 md:py-12'}`}>
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
         <h1 className="text-3xl md:text-5xl font-bold text-blue-500 mb-8">
           Discover the best activities for kids in your area
         </h1>
         {/* Mobile-optimized scrollable grid for main category buttons */}
         <div
           className={`${isMobile
             ? 'grid grid-rows-2 grid-flow-col auto-cols-[38%] gap-4 overflow-x-auto snap-x snap-mandatory pb-6 px-2 no-scrollbar'
             : 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-10 px-4'}
             max-w-5xl mx-auto z-category-grid`}
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
                 to={`/?filter=${category.id}${category.id === 'free-activities' ? '&price=Free' : ''}`}
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

     {/* Banner section */}
     <section className="bg-blue-50/50 pt-4 pb-2 sm:pb-4">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div
           className="relative w-full h-[150px] sm:h-[200px] rounded-xl overflow-hidden flex items-center justify-center"
           style={{
             backgroundImage: 'url("/images/athens-map-banner.png")',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}
         >
           <Link
             to="/"
             className="bg-white hover:bg-blue-50 text-blue-600 font-medium py-3 px-8 rounded-lg border-2 border-blue-200 transition duration-200 shadow-sm hover:shadow-md"
           >
             View All Activities
           </Link>
         </div>
       </div>
     </section>
     
     {/* Featured Content section */}
     <section className="pt-8 pb-4 bg-gray-50">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <h2 className="text-3xl md:text-2xl font-bold text-blue-500 mb-6">Featured Activities</h2>
         
         <LocationCarousel
           locations={featuredLocations}
           activityConfig={ACTIVITY_CATEGORIES}
           onSelect={handleLocationSelect}
           isLoading={isLoading}
           error={error}
         />
       </div>
     </section>

     {/* Free Activities section */}
     <section className="pt-4 pb-12 bg-gray-50">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <h2 className="text-3xl md:text-2xl font-bold text-blue-500 mb-6">Free Activities</h2>
         
         <LocationCarousel
           locations={freeActivities}
           activityConfig={ACTIVITY_CATEGORIES}
           onSelect={handleLocationSelect}
           isLoading={isLoading}
           error={error}
         />
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