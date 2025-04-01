import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getBlogPostBySlug, getRelatedBlogPosts } from '../../data/sampleBlogPosts';
import { BlogPost } from '../../types/blog';
import {
  BlogPostLayout,
  BlogPostHeader,
  MainImage,
  ImageSlider,
  BlogPostBody,
  RelatedContentSection,
  ShareButtons
} from '../Blog';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Reset state when slug changes
    setIsLoading(true);
    setNotFound(false);
    
    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    
    // Simulate network delay to show loading state
    const timer = setTimeout(() => {
      const blogPost = getBlogPostBySlug(slug);
      
      if (blogPost) {
        setPost(blogPost);
        
        // Get related posts
        const related = getRelatedBlogPosts(blogPost.id);
        setRelatedPosts(related);
      } else {
        setNotFound(true);
      }
      
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [slug]);

  // Handle 404 case
  if (notFound) {
    return <Navigate to="/blog" replace />;
  }

  // Loading state
  if (isLoading || !post) {
    return (
      <BlogPostLayout
        title="Loading Blog Post..."
        description="Loading blog post content."
      >
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5 mb-6"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
        </div>
      </BlogPostLayout>
    );
  }

  return (
    <BlogPostLayout
      title={post.title}
      description={post.summary}
      imageUrl={post.mainImage?.url}
      imageAlt={post.mainImage?.alt}
      canonicalUrl={`https://www.pamekids.com/blog/${post.slug}`}
    >
      {/* Back to blog link */}
      <div className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center text-blue-500 hover:text-blue-700"
        >
          <ChevronLeft size={18} />
          <span>Back to all articles</span>
        </Link>
      </div>
      
      {/* Post header with metadata */}
      <BlogPostHeader
        title={post.title}
        subtitle={post.subtitle}
        author={post.author}
        publishDate={post.publishDate}
        updatedDate={post.updatedDate}
        readingTime={post.readingTime}
        tags={post.tags}
        categories={post.categories}
      />
      
      {/* Main featured image */}
      {post.mainImage && <MainImage image={post.mainImage} />}
      
      {/* Image slider for posts with multiple images */}
      {post.images && post.images.length > 0 && (
        <ImageSlider
          images={post.images}
          blogTitle={post.title}
          blogId={post.id}
        />
      )}
      
      {/* Post content */}
      <BlogPostBody content={post.content} />
      
      {/* Social sharing buttons */}
      <div className="mt-8 mb-12 border-t border-gray-200 pt-6">
        <ShareButtons
          title={post.title}
          url={`https://www.pamekids.com/blog/${post.slug}`}
          summary={post.summary}
          hashtags={post.tags}
        />
      </div>
      
      {/* Related posts section */}
      {relatedPosts.length > 0 && (
        <RelatedContentSection posts={relatedPosts} />
      )}
    </BlogPostLayout>
  );
};

export default BlogPostPage;