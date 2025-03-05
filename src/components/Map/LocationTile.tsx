import React, { useState, useEffect } from 'react';
import { Location, ActivityType } from '../../data/locations';
import { fetchPlaceDetails } from '../../utils/places-api';
import { Star } from 'lucide-react';

interface LocationTileProps {
  location: Location;
  activityConfig: Record<ActivityType, { name: string; color: string }>;
  onSelect: () => void;
}

const LocationTile: React.FC<LocationTileProps> = ({ location, activityConfig, onSelect }) => {
  const [placeData, setPlaceData] = useState<Location['placeData']>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch place data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      // Skip if we already have data
      if (location.placeData || !window.google?.maps) return;
      
      setIsLoading(true);
      
      try {
        const data = await fetchPlaceDetails(location.id, window.google.maps);
        
        if (data) {
          setPlaceData(data);
          // Update the original location object to avoid refetching
          location.placeData = data;
        }
      } catch (error) {
        console.error('Error fetching place details for tile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [location]);

  // Combine placeData from state or from location
  const mergedPlaceData = placeData || location.placeData;

  // Get the first available photo URL
  const featuredImageUrl = !imageError && mergedPlaceData?.photoUrls && mergedPlaceData.photoUrls.length > 0
    ? mergedPlaceData.photoUrls[0]
    : null;

  // Fallback image based on the primary activity type
  const primaryType = location.primaryType || location.types[0];
  const fallbackImageColor = activityConfig[primaryType].color;
  
  // Use initial for fallback
  const initialLetter = location.name.charAt(0).toUpperCase();

  return (
    <div
      className="py-4 px-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Left content - Location info */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1.5 line-clamp-1">{location.name}</h3>
          
          {/* Activity Types */}
          <div className="flex flex-wrap gap-1 mb-2">
            {location.types.map(type => (
              <span
                key={type}
                className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: activityConfig[type].color + '20',
                  color: activityConfig[type].color
                }}
              >
                {activityConfig[type].name}
              </span>
            ))}
          </div>
          
          {/* Age range */}
          <span className="inline-block text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full mb-2">
            Ages {location.ageRange.min}-{location.ageRange.max}
          </span>
          
          {/* Location description - truncated */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{location.description}</p>
          
          {/* Rating display inside tile - simplified, non-clickable version */}
          {mergedPlaceData?.rating && mergedPlaceData.userRatingsTotal && (
            <div className="flex items-center">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => {
                  const rating = mergedPlaceData.rating || 0;
                  const starFilled = i < Math.floor(rating);
                  const hasHalfStar = i === Math.floor(rating) && rating % 1 >= 0.5;
                  
                  return (
                    <Star
                      key={i}
                      size={14}
                      className={`${
                        starFilled || hasHalfStar
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-gray-600 ml-1">
                {mergedPlaceData.rating.toFixed(1)} ({mergedPlaceData.userRatingsTotal > 1000
                  ? `${Math.floor(mergedPlaceData.userRatingsTotal / 1000)}k`
                  : mergedPlaceData.userRatingsTotal})
              </div>
            </div>
          )}
        </div>
        
        {/* Right side - Featured image (square with rounded corners) */}
        <div className="flex-shrink-0 w-28 h-28 md:w-24 md:h-24 overflow-hidden rounded-lg bg-gray-100 border border-gray-100">
          {featuredImageUrl ? (
            <img
              src={featuredImageUrl}
              alt={location.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: fallbackImageColor + '20' }}
            >
              <span
                className="text-3xl font-bold"
                style={{ color: fallbackImageColor }}
              >
                {initialLetter}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationTile;