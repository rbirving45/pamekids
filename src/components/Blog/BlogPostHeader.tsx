import React from 'react';
import { Clock, Calendar, Tag } from 'lucide-react';
import { Author } from '../../types/blog';

interface BlogPostHeaderProps {
  title: string;
  subtitle?: string;
  author: Author;
  publishDate: string;
  updatedDate?: string;
  readingTime?: number;
  tags?: string[];
  categories?: string[];
}

/**
 * Header component for blog posts
 * Displays title, author info, publication date, and metadata
 */
const BlogPostHeader: React.FC<BlogPostHeaderProps> = ({
  title,
  subtitle,
  author,
  publishDate,
  updatedDate,
  readingTime,
  tags,
  categories,
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="mb-8">
      {/* Title and subtitle */}
      <h1 className="text-3xl md:text-4xl font-bold text-blue-500 mb-2">{title}</h1>
      
      {subtitle && (
        <h2 className="text-xl md:text-2xl font-medium text-gray-700 mb-4">{subtitle}</h2>
      )}
      
      {/* Author and metadata section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Author info with avatar */}
        <div className="flex items-center">
          {author.avatar ? (
            <img
              src={author.avatar}
              alt={`${author.name}'s avatar`}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center mr-3">
              <span className="text-blue-600 font-medium">
                {author.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-800">{author.name}</p>
            {author.role && (
              <p className="text-sm text-gray-600">{author.role}</p>
            )}
          </div>
        </div>
        
        {/* Divider for mobile */}
        <div className="hidden sm:block sm:h-10 sm:w-px sm:bg-gray-300 sm:mx-1"></div>
        
        {/* Date and reading time */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar size={16} className="mr-1" />
            <span>{formatDate(publishDate)}</span>
          </div>
          
          {readingTime && (
            <div className="flex items-center">
              <Clock size={16} className="mr-1" />
              <span>{readingTime} min read</span>
            </div>
          )}
          
          {updatedDate && publishDate !== updatedDate && (
            <div className="flex items-center">
              <span className="text-sm italic">
                Updated: {formatDate(updatedDate)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Tags/categories */}
      {(tags && tags.length > 0) || (categories && categories.length > 0) ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags?.map(tag => (
            <span
              key={tag}
              className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
            >
              <Tag size={12} className="inline mr-1" />
              {tag}
            </span>
          ))}
          
          {categories?.map(category => (
            <span
              key={category}
              className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700"
            >
              {category}
            </span>
          ))}
        </div>
      ) : null}
      
      {/* Divider */}
      <div className="w-full h-px bg-gray-200 my-6"></div>
    </header>
  );
};

export default BlogPostHeader;