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
  
  // Create and inject the new script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(getApplicationSchema());
  document.head.appendChild(script);
};

// Named exports only, no default export
// This avoids the ESLint warning about anonymous default exports