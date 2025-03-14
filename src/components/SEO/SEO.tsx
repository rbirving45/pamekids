import React from 'react';
import { Helmet } from 'react-helmet';
import { APP_NAME, APP_URL, SEO as SEO_CONFIG, OPEN_GRAPH, TWITTER } from '../../utils/metadata';

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
  const metaImage = image || `${APP_URL}/${OPEN_GRAPH.image}`;
  const metaImageAlt = imageAlt || OPEN_GRAPH.imageAlt;
  const metaUrl = canonicalUrl || APP_URL;

  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={metaUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:alt" content={metaImageAlt} />

      {/* Twitter */}
      <meta name="twitter:card" content={TWITTER.card} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={metaImageAlt} />    </Helmet>
  );
};

export default SEO;