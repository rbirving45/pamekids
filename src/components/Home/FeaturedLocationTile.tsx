import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Location, ActivityType } from '../../types/location';
import { trackMarkerClick } from '../../utils/analytics';
import { Star } from 'lucide-react';

interface FeaturedLocationTileProps {
  location: Location;
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  onSelect?: () => void;
}

const FeaturedLocationTile: React.FC<FeaturedLocationTileProps> = ({
  location,
  activityConfig,
  onSelect
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Reset error state when location changes
  useEffect(() => {
    setImageError(false);
  }, [location.id]);

  // Get the place data from the location
  const placeData = location.placeData;

  // Get the first available photo URL with priority for permanent stored URLs
  const featuredImageUrl = useMemo(() => {
    // If image already errored, don't try to show it
    if (imageError) return null;
    
    // Use only storedPhotoUrls (from Firebase Storage)
    if (placeData?.storedPhotoUrls && placeData.storedPhotoUrls.length > 0) {
      return placeData.storedPhotoUrls[0];
    }
    
    return null;
  }, [placeData, imageError]);

  // Fallback image based on the primary activity type
  const primaryType = location.primaryType || location.types[0];
  const fallbackImageColor = activityConfig[primaryType].color;
  
  // Use initial for fallback
  const initialLetter = location.name.charAt(0).toUpperCase();

  const handleClick = () => {
    if (onSelect) {
      // Track the interaction with enhanced details
      trackMarkerClick(
        location.name,          // Business name
        location.id,            // Location ID for specific tracking
        location.types,         // Activity types for detailed reporting
        'list_item'             // Using an allowed tracking method (map_click, search_result, or list_item)
      );
      
      // Call the onSelect handler
      onSelect();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col transition-all hover:shadow-lg">
      {/* Image section */}
      <div className="h-48 bg-gray-200 relative">
        {featuredImageUrl ? (
          <img
            src={featuredImageUrl}
            alt={location.name}
            className="w-full h-full object-cover"
            onError={() => {
              console.warn(`Image loading error for: ${location.name}`);
              setImageError(true);
            }}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: fallbackImageColor + '20' }}
          >
            <span
              className="text-5xl font-bold"
              style={{ color: fallbackImageColor }}
            >
              {initialLetter}
            </span>
          </div>
        )}
        
        {/* Rating overlay if available - moved to top left */}
        {placeData?.rating && placeData.userRatingsTotal && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg px-2 py-1 flex items-center">
            <div className="flex items-center">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="ml-1 text-sm font-medium text-gray-800">
                {placeData.rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-600 ml-1">
                ({placeData.userRatingsTotal > 1000
                  ? `${Math.floor(placeData.userRatingsTotal / 1000)}k`
                  : placeData.userRatingsTotal})
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Location name - moved to top */}
        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{location.name}</h3>
        
        {/* Activity types */}
        <div className="flex flex-wrap gap-2 mb-2">
          {location.types.slice(0, 2).map(type => (
            <span
              key={type}
              className="inline-block px-2 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${activityConfig[type].color}20`,
                color: activityConfig[type].color
              }}
            >
              {activityConfig[type].name}
            </span>
          ))}
        </div>
        
        {/* Age range and price instead of address */}
        <p className="text-sm text-gray-600 mb-2">
          Ages {location.ageRange.min}-{location.ageRange.max}
          {location.priceRange && (
            <>
              {" • "}
              {location.priceRange}
            </>
          )}
        </p>
        
        {/* Description - limited to 3 lines */}
        <p className="text-sm text-gray-700 mb-4 line-clamp-3 flex-1">{location.description}</p>
        
        {/* View details link - can be internal link or button */}
        {onSelect ? (
          <button
            onClick={handleClick}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details →
          </button>
        ) : (
          <Link to={`/?locationId=${location.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View Details →
          </Link>
        )}
      </div>
    </div>
  );
};

export default FeaturedLocationTile;