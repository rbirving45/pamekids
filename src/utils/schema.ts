import { APP_NAME, APP_URL, APP_DESCRIPTION, CITY } from './metadata';

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
 * Helper function to inject schema.org structured data into the document head
 * Call this function in a useEffect to add the schema to the page
 */
export const injectSchemaOrgData = () => {
  // Remove any existing schema.org scripts to prevent duplicates
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => script.remove());
  
  // Create and inject the application schema
  const appScript = document.createElement('script');
  appScript.type = 'application/ld+json';
  appScript.text = JSON.stringify(getApplicationSchema());
  document.head.appendChild(appScript);
  
  // Create and inject the organization schema
  const orgScript = document.createElement('script');
  orgScript.type = 'application/ld+json';
  orgScript.text = JSON.stringify(getOrganizationSchema());
  document.head.appendChild(orgScript);
};

// Named exports only, no default export
// This avoids the ESLint warning about anonymous default exports