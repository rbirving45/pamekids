import React, { useState } from 'react';
import { BlogImage } from '../../../types/blog';

interface NestedImageProps {
  image: BlogImage;
  align?: 'left' | 'center' | 'right';
  width?: 'narrow' | 'medium' | 'wide' | 'full';
}

/**
 * Component for images embedded within blog content
 * Supports various alignments and widths
 */
const NestedImage: React.FC<NestedImageProps> = ({
  image,
  align = 'center',
  width = 'medium'
}) => {
  const [imageError, setImageError] = useState(false);

  // Width classes based on the width prop
  const widthClasses = {
    narrow: 'max-w-xs',
    medium: 'max-w-md',
    wide: 'max-w-lg',
    full: 'w-full'
  };

  // Alignment classes based on the align prop
  const alignClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto'
  };

  // Handle image loading error
  if (imageError) {
    return (
      <div className={`bg-gray-200 h-40 rounded flex items-center justify-center mb-6 ${alignClasses[align]} ${widthClasses[width]}`}>
        <p className="text-gray-500 text-sm">Image not available</p>
      </div>
    );
  }

  return (
    <figure className={`mb-6 ${alignClasses[align]} ${widthClasses[width]}`}>
      <div className="overflow-hidden rounded-lg">
        <img
          src={image.url}
          alt={image.alt}
          className="w-full h-auto"
          onError={() => setImageError(true)}
          loading="lazy" // Lazy load nested images
        />
      </div>
      
      {(image.caption || image.credit) && (
        <figcaption className="mt-2 text-sm text-gray-600 italic">
          {image.caption}
          {image.caption && image.credit && <span> — </span>}
          {image.credit && <span className="not-italic font-medium">Photo: {image.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
};

export default NestedImage;