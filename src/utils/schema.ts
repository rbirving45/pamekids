import { APP_NAME, APP_URL, APP_DESCRIPTION, CITY } from './metadata';
import { BlogPost } from '../types/blog';

/**
 * Generates schema.org structured data for the PameKids web application
 * This helps search engines understand the purpose of the app and display rich search results
 *
 * @returns The schema.org WebApplication object as a JavaScript object
 */
export const getApplicationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": APP_NAME,
    "url": APP_URL,
    "description": APP_DESCRIPTION,
    "applicationCategory": "Maps & Kids Activities",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    },
    "areaServed": {
      "@type": "City",
      "name": CITY.name,
      "containedInPlace": {
        "@type": "Country",
        "name": CITY.country
      }
    },
    "image": `${APP_URL}/logo512.png`,
    "publisher": {
      "@type": "Organization",
      "name": APP_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${APP_URL}/logo512.png`
      }
    }
  };
};

/**
 * Generates schema.org structured data for the PameKids organization
 * This provides explicit branding information for search engines
 *
 * @returns The schema.org Organization object as a JavaScript object
 */
export const getOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": APP_NAME,
    "url": APP_URL,
    "logo": `${APP_URL}/logo512.png`,
    "image": `${APP_URL}/logo512.png`,
    "description": APP_DESCRIPTION,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": CITY.name,
      "addressCountry": CITY.country
    }
  };
};

/**
 * Generates schema.org structured data for a blog post
 * This helps search engines display rich results for blog content
 *
 * @param post The blog post object containing all necessary data
 * @returns The schema.org BlogPosting object as a JavaScript object
 */
export const getBlogPostSchema = (post: BlogPost) => {
  // Convert publish date to ISO format if it's not already
  const publishDate = new Date(post.publishDate).toISOString();
  
  // Convert update date to ISO format if it exists
  const modifiedDate = post.updatedDate
    ? new Date(post.updatedDate).toISOString()
    : publishDate;
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${APP_URL}/blog/${post.slug}`
    },
    "headline": post.title,
    "description": post.summary,
    "image": post.mainImage?.url || `${APP_URL}/og-image.jpg`,
    "author": {
      "@type": "Person",
      "name": post.author.name
    },
    "publisher": {
      "@type": "Organization",
      "name": APP_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${APP_URL}/logo512.png`
      }
    },
    "datePublished": publishDate,
    "dateModified": modifiedDate,
    "keywords": post.tags?.join(', ') || '',
    "articleSection": post.categories?.join(', ') || ''
  };
};

/**
 * Helper function to inject schema.org structured data into the document head
 * Call this function in a useEffect to add the schema to the page
 *
 * @param type The type of schema to inject ('application', 'organization', or 'blog')
 * @param data Optional data needed for specific schema types (e.g., blog post data)
 */
export const injectSchemaOrgData = (type: 'application' | 'organization' | 'blog' = 'application', data?: any) => {
  // Remove any existing schema.org scripts to prevent duplicates
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());
  
  let schemaData;
  
  // Generate the appropriate schema based on the type
  switch (type) {
    case 'blog':
      if (data && 'id' in data) {
        schemaData = getBlogPostSchema(data);
      } else {
        console.error('Blog post data is required for blog schema');
        return;
      }
      break;
    case 'organization':
      schemaData = getOrganizationSchema();
      break;
    case 'application':
    default:
      schemaData = getApplicationSchema();
      break;
  }
  
  // Create and inject the schema script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schemaData);
  document.head.appendChild(script);
};

// Named exports only, no default export
// This avoids the ESLint warning about anonymous default exports