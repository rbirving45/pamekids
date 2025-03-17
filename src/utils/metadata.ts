/**
 * Central configuration for PameKids app metadata
 * This file serves as a single source of truth for all SEO and sharing-related metadata
 *
 * IMPORTANT: When updating values in this file, you must also manually update:
 * 1. /public/site.webmanifest - Update name, short_name, description, theme_color
 * 2. /public/browserconfig.xml - Update TileColor to match BRAND.primaryColor
 * 3. /public/index.html - Ensure Google Analytics ID matches ANALYTICS.GA_MEASUREMENT_ID
 */

// App identity
export const APP_NAME = "PameKids";
export const APP_DESCRIPTION = "Find the best children's activities in Athens, Greece. Indoor play, outdoor activities, sports, arts, music, education and entertainment for kids.";
export const APP_URL = "https://www.pamekids.com";

// Brand colors
export const BRAND = {
  primaryColor: "#4285F4",
  secondaryColor: "#ffffff",
};

// Logo configuration - centralized references to all logo files
export const LOGOS = {
  favicon: "favicon.ico",
  favicon16: "favicon-16x16.png",
  favicon32: "favicon-32x32.png",
  logo150: "logo150.png",
  logo192: "logo192.png",
  logo512: "logo512.png",
  maskableIcon: "maskable-icon.png",
  appleTouchIcon: "apple-touch-icon.png",
  // Use existing logo for Safari pinned tab
  safariPinnedTab: "logo150.png",
  ogImage: "og-image.jpg",
};

// SEO metadata
export const SEO = {
  title: `${APP_NAME} - Children's Activities in Athens`,
  description: APP_DESCRIPTION,
  keywords: "children activities, Athens, Greece, kids, indoor play, outdoor activities, sports, arts, music, education, entertainment, playgrounds, parks",
  author: "PameKids",
  language: "en",
};

// Open Graph metadata (for social media sharing)
export const OPEN_GRAPH = {
  title: SEO.title,
  description: SEO.description,
  url: APP_URL,
  type: "website",
  siteName: APP_NAME,
  locale: "en_US",
  // This path is relative to the public folder
  image: LOGOS.ogImage,
  imageAlt: "PameKids - Find children's activities in Athens",
  imageWidth: "1200",
  imageHeight: "630",
};

// Twitter Card metadata
export const TWITTER = {
  // Switch to summary_large_image for better visual impact
  card: "summary_large_image",
  title: OPEN_GRAPH.title,
  description: OPEN_GRAPH.description,
  // Use the same image as Open Graph for consistency across platforms
  image: LOGOS.ogImage,
  imageAlt: OPEN_GRAPH.imageAlt,
};

// App activity categories with colors (from your activityConfig in App.tsx)
export const ACTIVITY_CATEGORIES = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679' },
  'sports': { name: 'Sports', color: '#FF8C00' },
  'arts': { name: 'Arts', color: '#9C27B0' },
  'music': { name: 'Music', color: '#3F51B5' },
  'education': { name: 'Education', color: '#4285F4' },
  'entertainment': { name: 'Entertainment', color: '#FFB300' }
};

// City information
export const CITY = {
  name: "Athens",
  country: "Greece",
  lat: 37.9838,
  lng: 23.7275,
};

// Analytics configuration
export const ANALYTICS = {
  GA_MEASUREMENT_ID: 'G-0JSE2646NP',
};