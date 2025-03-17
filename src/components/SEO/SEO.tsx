import React from 'react';
import { Helmet } from 'react-helmet';
import {
  APP_NAME,
  APP_URL,
  SEO as SEO_CONFIG,
  OPEN_GRAPH,
  TWITTER,
  LOGOS,
  BRAND
} from '../../utils/metadata';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

/**
 * SEO component for dynamically updating metadata based on the current page
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  image,
  imageAlt,
  type = 'website',
  noIndex = false,
}) => {
  // Use provided values or fallback to defaults
  const metaTitle = title ? `${title} | ${APP_NAME}` : SEO_CONFIG.title;
  const metaDescription = description || SEO_CONFIG.description;
  
  // Ensure metaImage is always an absolute URL (handle both relative and absolute paths)
  const metaImage = image
    ? (image.startsWith('http') ? image : `${APP_URL}/${image}`)
    : `${APP_URL}/${OPEN_GRAPH.image}`;
  
  const metaImageAlt = imageAlt || OPEN_GRAPH.imageAlt;
  const metaUrl = canonicalUrl || APP_URL;

  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={SEO_CONFIG.keywords} />
      <meta name="author" content={SEO_CONFIG.author} />
      <meta name="language" content={SEO_CONFIG.language} />
      <link rel="canonical" href={metaUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
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
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
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
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={metaImageAlt} />
    </Helmet>
  );
};

export default SEO;