import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../../types/blog';

interface RelatedContentSectionProps {
  posts: Partial<BlogPost>[];
  title?: string;
}

/**
 * Component for displaying related blog posts
 * Shows a grid of post cards with titles, images, and summaries
 */
const RelatedContentSection: React.FC<RelatedContentSectionProps> = ({
  posts,
  title = "Related Articles"
}) => {
  // If no posts, don't render anything
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-8">
      <h2 className="text-2xl font-bold text-blue-500 mb-6">{title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <RelatedPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
};

// Card component for each related post
const RelatedPostCard: React.FC<{ post: Partial<BlogPost> }> = ({ post }) => {
  // Generate fallback image based on post title
  const getFallbackImage = (title: string) => {
    // Choose a color based on the first character of the title
    const colors = ['#6BAAD4', '#4F6490', '#8BC34A', '#E893B2', '#F9D056', '#80A4ED', '#7CB342', '#E57373', '#9575CD'];
    const colorIndex = title.charCodeAt(0) % colors.length;
    const backgroundColor = colors[colorIndex];
    const initialLetter = title.charAt(0).toUpperCase();
    
    return { backgroundColor, initialLetter };
  };
  
  const { backgroundColor, initialLetter } = getFallbackImage(post.title || 'Blog');
  
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white h-full flex flex-col"
    >
      {/* Post image */}
      <div className="h-40 relative bg-gray-200">
        {post.mainImage?.url ? (
          <img
            src={post.mainImage.url}
            alt={post.mainImage.alt || post.title || 'Blog post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: backgroundColor + '20' }}
          >
            <span
              className="text-5xl font-bold"
              style={{ color: backgroundColor }}
            >
              {initialLetter}
            </span>
          </div>
        )}
      </div>
      
      {/* Post content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{post.title}</h3>
        
        {post.publishDate && (
          <p className="text-sm text-gray-600 mb-2">
            {new Date(post.publishDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            
            {post.readingTime && (
              <>
                <span className="ml-2">·</span>
                <span className="ml-2">{post.readingTime} min read</span>
              </>
            )}
          </p>
        )}
        
        {post.summary && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-3 overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: '3',
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.5em',
            height: '4.5em'
          }}>
            {post.summary}
          </p>
        )}
        
        <span className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-auto">
          Read More →
        </span>
      </div>
    </Link>
  );
};

export default RelatedContentSection;