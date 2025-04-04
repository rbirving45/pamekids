import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  APP_URL,
  SEO as SEO_CONFIG,
  OPEN_GRAPH,
  TWITTER,
  LOGOS,
  BRAND,
  PAGE_SEO
} from '../../utils/metadata';
import { injectSchemaOrgData } from '../../utils/schema';
import { BlogPost } from '../../types/blog';

// Define a type for page types to use in the SEO component
export type PageType = 'home' | 'map' | 'blogIndex' | 'blogPost' | 'privacy' | 'terms' | 'admin' | 'custom';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string;
  pageType?: PageType; // New prop to specify which page type is being rendered
  blogPost?: BlogPost; // Optional blog post data for blog posts
  schemaType?: 'application' | 'organization' | 'blog'; // Type of schema to inject
}

/**
 * SEO component for dynamically updating metadata based on the current page
 *
 * Usage:
 * 1. With pageType - <SEO pageType="home" /> - Uses predefined config from PAGE_SEO
 * 2. With custom values - <SEO title="Custom Title" description="Custom description" />
 * 3. For blog posts - <SEO pageType="blogPost" blogPost={post} />
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  image,
  imageAlt,
  type = 'website',
  noIndex = false,
  keywords,
  pageType = 'custom', // Default to custom if no page type is specified
  blogPost,
  schemaType = 'application'
}) => {
  // Apply page-specific SEO settings based on pageType
  let pageConfig = {};
  
  if (pageType !== 'custom') {
    // Get the page-specific config
    const config = PAGE_SEO[pageType];
    
    if (config) {
      pageConfig = config;
      
      // For blog posts, we need special handling
      if (pageType === 'blogPost' && blogPost) {
        // Use blog post data for title, etc.
        title = title || `${blogPost.title} | ${PAGE_SEO.blogPost.titleSuffix}`;
        description = description || blogPost.summary;
        canonicalUrl = canonicalUrl || `${APP_URL}/blog/${blogPost.slug}`;
        image = image || blogPost.mainImage?.url || PAGE_SEO.blogPost.fallbackImage;
        imageAlt = imageAlt || blogPost.mainImage?.alt || PAGE_SEO.blogPost.fallbackImageAlt;
        type = 'article';
        keywords = keywords || blogPost.tags?.join(', ') || PAGE_SEO.blogPost.keywords;
        
        // Update schema type for blog posts
        schemaType = 'blog';
      }
    }
  }
  
  // Use provided values, page config values, or fallback to defaults in this priority order
  const metaTitle = title ||
    (pageConfig as any).title ||
    SEO_CONFIG.title;
    
  const metaDescription = description ||
    (pageConfig as any).description ||
    SEO_CONFIG.description;
  
  const metaKeywords = keywords ||
    (pageConfig as any).keywords ||
    SEO_CONFIG.keywords;
    
  const metaCanonicalUrl = canonicalUrl ||
    (pageConfig as any).canonicalUrl ||
    APP_URL;
  
  // Ensure metaImage is always an absolute URL (handle both relative and absolute paths)
  const metaImage = image
    ? (image.startsWith('http') ? image : `${APP_URL}/${image}`)
    : (pageConfig as any).image
      ? `${APP_URL}/${(pageConfig as any).image}`
      : `${APP_URL}/${OPEN_GRAPH.image}`;
  
  const metaImageAlt = imageAlt ||
    (pageConfig as any).imageAlt ||
    OPEN_GRAPH.imageAlt;
    
  const metaType = type ||
    (pageConfig as any).type ||
    'website';
    
  const metaNoIndex = noIndex ||
    (pageConfig as any).noIndex ||
    false;

  // Inject schema.org structured data
  useEffect(() => {
    if (blogPost && schemaType === 'blog') {
      // Inject blog post schema
      injectSchemaOrgData('blog', blogPost);
    } else {
      // Inject regular application or organization schema
      injectSchemaOrgData(schemaType);
    }
  }, [blogPost, schemaType]);

  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={SEO_CONFIG.author} />
      <meta name="language" content={SEO_CONFIG.language} />
      <link rel="canonical" href={metaCanonicalUrl} />
      {metaNoIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Theme color and icons */}
      <meta name="theme-color" content={BRAND.primaryColor} />
      <link rel="icon" href={`${process.env.PUBLIC_URL}/${LOGOS.favicon}`} sizes="any" />
      <link rel="icon" type="image/png" sizes="32x32" href={`${process.env.PUBLIC_URL}/${LOGOS.favicon32}`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${process.env.PUBLIC_URL}/${LOGOS.favicon16}`} />
      <link rel="apple-touch-icon" href={`${process.env.PUBLIC_URL}/${LOGOS.appleTouchIcon}`} />
      
      {/* Using logo150.png for Safari pinned tab */}
      <link rel="mask-icon" href={`${process.env.PUBLIC_URL}/${LOGOS.safariPinnedTab}`} color={BRAND.primaryColor} />
      
      {/* Microsoft specific */}
      <meta name="msapplication-TileColor" content={BRAND.primaryColor} />
      <meta name="msapplication-config" content={`${process.env.PUBLIC_URL}/browserconfig.xml`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={metaType} />
      <meta property="og:url" content={metaCanonicalUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:alt" content={metaImageAlt} />
      <meta property="og:image:width" content={OPEN_GRAPH.imageWidth} />
      <meta property="og:image:height" content={OPEN_GRAPH.imageHeight} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:site_name" content={OPEN_GRAPH.siteName} />
      <meta property="og:locale" content={OPEN_GRAPH.locale} />

      {/* Twitter */}
      <meta name="twitter:card" content={TWITTER.card} />
      <meta name="twitter:url" content={metaCanonicalUrl} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={metaImageAlt} />
      
      {/* Add publication date and modified date for articles */}
      {metaType === 'article' && blogPost && (
        <>
          <meta property="article:published_time" content={new Date(blogPost.publishDate).toISOString()} />
          {blogPost.updatedDate && (
            <meta property="article:modified_time" content={new Date(blogPost.updatedDate).toISOString()} />
          )}
          {blogPost.tags && blogPost.tags.map((tag, index) => (
            <meta property="article:tag" content={tag} key={index} />
          ))}
        </>
      )}
    </Helmet>
  );
};

export default SEO;