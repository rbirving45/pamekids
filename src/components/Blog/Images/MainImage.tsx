import React, { useState } from 'react';
import { BlogImage } from '../../../types/blog';

interface MainImageProps {
  image: BlogImage;
}

/**
 * Hero/featured image component for blog posts
 * Displays a large, responsive image with optional caption and credit
 */
const MainImage: React.FC<MainImageProps> = ({ image }) => {
  const [imageError, setImageError] = useState(false);

  // If image fails to load
  if (imageError) {
    return (
      <div className="w-full h-60 bg-gray-200 flex items-center justify-center rounded-lg mb-8">
        <p className="text-gray-500">Image not available</p>
      </div>
    );
  }

  return (
    <figure style={{margin: 0, padding: 0}}>
      <div className="w-full rounded-lg">
        <img
          src={image.url}
          alt={image.alt}
          className="w-full h-auto rounded-lg"
          onError={() => setImageError(true)}
          loading="eager"
        />
      </div>
      
      {(image.caption || image.credit) && (
        <figcaption className="text-sm text-gray-600 italic">
          {image.caption}
          {image.caption && image.credit && <span> — </span>}
          {image.credit && <span className="not-italic font-medium">Photo: {image.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
};

export default MainImage;