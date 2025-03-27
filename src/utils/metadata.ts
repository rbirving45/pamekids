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
  title: `${APP_NAME} - Children's Activities in Greece`,
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
  imageAlt: "PameKids - Find children's activities in Greece",
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

// Define type for activity category structure
export interface ActivityCategory {
  name: string;
  color: string;
}

// App activity categories with colors
export const ACTIVITY_CATEGORIES: Record<string, ActivityCategory> = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679' },
  'sports': { name: 'Sports', color: '#FF8C00' },
  'arts': { name: 'Arts', color: '#9C27B0' },
  'music': { name: 'Music', color: '#3F51B5' },
  'education': { name: 'Education', color: '#4285F4' },
  'entertainment': { name: 'Entertainment', color: '#FFB300' },
  'camp': { name: 'Camps', color: '#8BC34A' },
  'language': { name: 'Language', color: '#009688' },
  'drama': { name: 'Drama', color: '#E91E63' },
  'history': { name: 'History', color: '#795548' },
  'stem': { name: 'STEM', color: '#00BCD4' },
  'animals': { name: 'Animals', color: '#607D8B' },
  'playground': { name: 'Playground', color: '#4CAF50' },
  'play-space': { name: 'Play Space', color: '#FF5722' },
  'martial-arts': { name: 'Martial Arts', color: '#F44336' },
  'soccer': { name: 'Soccer', color: '#7CB342' },
  'basketball': { name: 'Basketball', color: '#FF9800' },
  'tennis': { name: 'Tennis', color: '#CDDC39' },
  'horseback-riding': { name: 'Horseback Riding', color: '#8D6E63' },
  'dance': { name: 'Dance', color: '#BA68C8' },
  'gymnastics': { name: 'Gymnastics', color: '#26A69A' },
  'yoga': { name: 'Yoga', color: '#9575CD' },
  'swim': { name: 'Swimming', color: '#29B6F6' },
  'movies': { name: 'Movies', color: '#EC407A' },
  'theme-park': { name: 'Theme Parks', color: '#FFA726' },
  'event-space': { name: 'Event Spaces', color: '#78909C' },
  'beach': { name: 'Beaches', color: '#80DEEA' },
  'hike': { name: 'Hiking', color: '#66BB6A' },
  'restaurant': { name: 'Restaurants', color: '#EF5350' },
  'cafe': { name: 'Cafes', color: '#D4E157' },
  'summer-camp': { name: 'Summer Camp', color: '#8BC34A' },
  'easter-camp': { name: 'Easter Camp', color: '#AFB42B' },
  'hotel': { name: 'Hotel', color: '#5D4037' },
  'resort': { name: 'Resort', color: '#00796B' },
  'nature': { name: 'Nature', color: '#80DEEA' }
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

// Define interface for activity group structure
export interface ActivityGroup {
  name: string;      // Display name for the group
  color: string;     // Color for the group button
  types: string[];   // Array of activity type keys that belong to this group
}

// Activity groups for filter organization
export const ACTIVITY_GROUPS: Record<string, ActivityGroup> = {
  'camps': {
    name: 'Camps',
    color: '#8BC34A',
    types: ['camp', 'summer-camp', 'easter-camp']
  },
  'learning': {
    name: 'Learning',
    color: '#4285F4',
    types: ['music', 'language', 'arts', 'drama', 'history', 'stem', 'animals', 'education']
  },
  'outdoor-play': {
    name: 'Outdoor Play',
    color: '#33B679',
    types: ['outdoor-play', 'playground']
  },
  'indoor-play': {
    name: 'Indoor Play',
    color: '#FF4444',
    types: ['indoor-play', 'play-space']
  },
  'sports': {
    name: 'Sports',
    color: '#FF8C00',
    types: ['sports', 'martial-arts', 'soccer', 'basketball', 'tennis', 'horseback-riding', 'dance', 'gymnastics', 'yoga', 'swim']
  },
  'entertainment': {
    name: 'Entertainment',
    color: '#FFB300',
    types: ['movies', 'theme-park', 'event-space', 'entertainment']
  },
  'nature': {
    name: 'Nature',
    color: '#66BB6A',
    types: ['nature', 'beach', 'hike']
  },
  'food': {
    name: 'Food',
    color: '#EF5350',
    types: ['restaurant', 'cafe']
  },
  'accommodation': {
    name: 'Accommodation',
    color: '#5D4037',
    types: ['hotel', 'resort']
  }
};