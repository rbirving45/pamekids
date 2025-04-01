import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { sampleBlogPosts } from '../../data/sampleBlogPosts';
import { BlogPost } from '../../types/blog';
import Header from '../Layout/Header';
import Footer from '../Layout/Footer';
import SEO from '../SEO';

const BlogIndexPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // TEMPORARY: Disable category filters
  const showCategoryFilters = false; // Set to true to re-enable

  // Get unique categories from all blog posts
  const allCategories = Array.from(
    new Set(
      sampleBlogPosts.flatMap(post => post.categories || [])
    )
  );

  // Fetch and filter blog posts
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      const filteredPosts = selectedCategory
        ? sampleBlogPosts.filter(post =>
            post.categories && post.categories.includes(selectedCategory)
          )
        : sampleBlogPosts;
      
      // Sort by publish date (newest first)
      const sortedPosts = [...filteredPosts].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      
      setPosts(sortedPosts);
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Blog - PameKids"
        description="Articles, guides and reviews about children's activities in Athens, Greece."
      />
      
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-header w-full">
        <Header />
      </div>
      
      {/* Spacing for fixed header */}
      <div className="h-16"></div>
      
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-blue-500 mb-2">PameKids Blog</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover articles, guides and reviews about children's activities in Athens and beyond.
            </p>
          </div>
          
          {/* Category Filters */}
          {showCategoryFilters && (
            <div className="mb-8">
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  All Posts
                </button>
                
                {allCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Blog Post Grid */}
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            // Blog posts grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            // No posts found
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No blog posts found for this category. Please check back later.
              </p>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  View All Posts
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Blog post card component
const BlogPostCard: React.FC<{ post: BlogPost }> = ({ post }) => {
  // TEMPORARY: Disable category badges on cards
  const showCategoryBadges = false; // Set to true to re-enable
  // TEMPORARY: Disable author information
  const showAuthorInfo = false; // Set to true to re-enable
  
  // Generate fallback image based on post title
  const getFallbackImage = (title: string) => {
    // Choose a color based on the first character of the title
    const colors = ['#6BAAD4', '#4F6490', '#8BC34A', '#E893B2', '#F9D056', '#80A4ED', '#7CB342', '#E57373', '#9575CD'];
    const colorIndex = title.charCodeAt(0) % colors.length;
    const backgroundColor = colors[colorIndex];
    const initialLetter = title.charAt(0).toUpperCase();
    
    return { backgroundColor, initialLetter };
  };
  
  const { backgroundColor, initialLetter } = getFallbackImage(post.title);
  
  // Format the publish date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col"
    >
      {/* Post image */}
      <div className="h-48 relative">
        {post.mainImage?.url ? (
          <img
            src={post.mainImage.url}
            alt={post.mainImage.alt || post.title}
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
        
        {/* Categories overlay */}
        {showCategoryBadges && post.categories && post.categories.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">
            {post.categories.slice(0, 2).map(category => (
              <span
                key={category}
                className="bg-blue-500 bg-opacity-90 text-white text-xs font-medium px-2 py-1 rounded-full"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Post content */}
      <div className="p-6 flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{post.title}</h2>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Calendar size={14} className="mr-1" />
          <span>{formatDate(post.publishDate)}</span>
          
          {post.readingTime && (
            <span className="ml-4">{post.readingTime} min read</span>
          )}
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-3">{post.summary}</p>
        
        <div className="mt-auto flex items-center">
          {/* Author info */}
          {showAuthorInfo ? (
            <div className="flex items-center">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-8 h-8 rounded-full mr-2"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                  <span className="text-blue-600 font-medium">
                    {post.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{post.author.name}</span>
            </div>
          ) : (
            <div></div> /* Empty div to maintain layout */
          )}
          
          <span className={`${showAuthorInfo ? 'ml-auto' : ''} text-blue-500 font-medium`}>Read More →</span>
        </div>
      </div>
    </Link>
  );
};

export default BlogIndexPage;