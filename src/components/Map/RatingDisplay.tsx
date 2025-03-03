import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { trackExternalLink, addUtmParams } from '../../utils/analytics';

interface RatingDisplayProps {
  rating: number;
  totalRatings: number;
  placeId: string;
  businessName: string;
}

const RatingDisplay: React.FC<RatingDisplayProps> = React.memo(({ rating, totalRatings, placeId, businessName }) => {
  const { fullStars, hasHalfStar } = useMemo(() => ({
    fullStars: Math.floor(rating),
    hasHalfStar: rating % 1 >= 0.5
  }), [rating]);

  const handleReviewClick = () => {
    const baseUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    const reviewsUrl = addUtmParams(baseUrl);
    trackExternalLink('reviews', businessName, reviewsUrl);
    window.open(reviewsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleReviewClick}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      title="Click to see reviews on Google"
    >
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${
              i < fullStars
                ? 'text-yellow-400 fill-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <div className="text-sm text-gray-600">
        {rating.toFixed(1)} ({totalRatings.toLocaleString()} reviews)
      </div>
      <img
        src="https://gstatic.com/images/branding/googlelogo/2x/googlelogo_color_42x16dp.png"
        alt="Powered by Google"
        className="h-4 ml-1"
      />
    </button>
  );
});

export default RatingDisplay;