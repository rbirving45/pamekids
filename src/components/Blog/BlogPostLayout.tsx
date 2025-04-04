import React, { ReactNode } from 'react';
import Header from '../Layout/Header';
import Footer from '../Layout/Footer';
import SEO from '../SEO';
import { BlogPost } from '../../types/blog';

interface BlogPostLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  canonicalUrl?: string;
  post?: BlogPost; // Full blog post object for enhanced SEO
}

/**
 * Main layout component for blog posts
 * Provides consistent structure, integrates with Header/Footer,
 * and handles SEO metadata
 */
const BlogPostLayout: React.FC<BlogPostLayoutProps> = ({
  children,
  title,
  description,
  imageUrl,
  imageAlt,
  canonicalUrl,
  post, // Add post to destructuring
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Enhanced SEO using pageType and blog post data */}
      {post ? (
        // If we have the full post object, use it for enhanced SEO
        <SEO
          pageType="blogPost"
          blogPost={post}
        />
      ) : (
        // Fallback to individual props if post object isn't available
        <SEO
          title={title}
          description={description}
          image={imageUrl}
          imageAlt={imageAlt || title}
          canonicalUrl={canonicalUrl}
          type="article"
        />
      )}
      
      {/* Fixed header from existing component */}
      <div className="fixed top-0 left-0 right-0 z-header w-full">
        <Header />
      </div>
      
      {/* Add spacing to account for fixed header */}
      <div className="h-16"></div>
      
      {/* Main content area */}
      <main className="flex-1 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Blog post content will be placed here */}
          <article className="prose prose-blue max-w-none">
            {children}
          </article>
        </div>
      </main>
      
      {/* Reuse the existing Footer component */}
      <Footer />
    </div>
  );
};

export default BlogPostLayout;