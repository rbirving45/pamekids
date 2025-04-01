import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BlogImage } from '../../../types/blog';
import { trackPhotoInteraction } from '../../../utils/analytics';

interface ImageSliderProps {
  images: BlogImage[];
  blogTitle: string;
  blogId?: string;
}

/**
 * Image slider/carousel component for displaying multiple images
 * Includes navigation controls and caption display
 */
const ImageSlider: React.FC<ImageSliderProps> = ({
  images,
  blogTitle,
  blogId
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Track when the component mounts and images are viewed
  useEffect(() => {
    if (images.length > 0) {
      trackPhotoInteraction(
        'view',
        blogTitle,
        blogId,
        0,
        images.length
      );
    }
  }, [images, blogTitle, blogId]);

  // Navigate to the previous image
  const goToPrevious = () => {
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    
    // Track the swipe interaction
    trackPhotoInteraction(
      'swipe',
      blogTitle,
      blogId,
      newIndex,
      images.length
    );
  };

  // Navigate to the next image
  const goToNext = () => {
    const isLastImage = currentIndex === images.length - 1;
    const newIndex = isLastImage ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    
    // Track the swipe interaction
    trackPhotoInteraction(
      'swipe',
      blogTitle,
      blogId,
      newIndex,
      images.length
    );
  };

  // Handle touch start event for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  // Handle touch move event for swipe gesture
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.touches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // If swipe distance is greater than 50px, navigate accordingly
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
      setTouchStart(null);
    }
  };

  // No images to display
  if (images.length === 0) {
    return null;
  }

  // Current image to display
  const currentImage = images[currentIndex];

  return (
    <div className="mb-8">
      <div
        className="relative mb-2 rounded-lg overflow-hidden"
        style={{ maxHeight: '500px' }}
        ref={sliderRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Image */}
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
        
        {/* Left/right navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm py-1 px-2 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
      
      {/* Caption */}
      {(currentImage.caption || currentImage.credit) && (
        <figcaption className="text-sm text-gray-600 italic">
          {currentImage.caption}
          {currentImage.caption && currentImage.credit && <span> — </span>}
          {currentImage.credit && <span className="not-italic font-medium">Photo: {currentImage.credit}</span>}
        </figcaption>
      )}
    </div>
  );
};

export default ImageSlider;