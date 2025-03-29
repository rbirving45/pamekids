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

// App activity categories with colors matching their group colors
export const ACTIVITY_CATEGORIES: Record<string, ActivityCategory> = {
  // Learning group - Soft blue #6BAAD4
  'music': { name: 'Music', color: '#6BAAD4' },
  'language': { name: 'Language', color: '#6BAAD4' },
  'arts': { name: 'Arts', color: '#6BAAD4' },
  'drama': { name: 'Drama', color: '#6BAAD4' },
  'history': { name: 'History', color: '#6BAAD4' },
  'stem': { name: 'STEM', color: '#6BAAD4' },
  'animals': { name: 'Animals', color: '#6BAAD4' },
  'education': { name: 'Education', color: '#6BAAD4' },
  'cooking': { name: 'Cooking', color: '#6BAAD4' },

  // Sports group - Muted navy #4F6490
  'sports': { name: 'Sports', color: '#4F6490' },
  'martial-arts': { name: 'Martial Arts', color: '#4F6490' },
  'soccer': { name: 'Soccer', color: '#4F6490' },
  'basketball': { name: 'Basketball', color: '#4F6490' },
  'tennis': { name: 'Tennis', color: '#4F6490' },
  'horseback-riding': { name: 'Horseback Riding', color: '#4F6490' },
  'dance': { name: 'Dance', color: '#4F6490' },
  'gymnastics': { name: 'Gymnastics', color: '#4F6490' },
  'yoga': { name: 'Yoga', color: '#4F6490' },
  'swim': { name: 'Swimming', color: '#4F6490' },

  // Outdoor Play group - Soft green #8BC34A
  'outdoor-play': { name: 'Outdoor Play', color: '#8BC34A' },
  'playground': { name: 'Playground', color: '#8BC34A' },
  'sports-field': { name: 'Sports Field', color: '#8BC34A' },
  'park': { name: 'Park', color: '#8BC34A' },

  // Indoor Play group - Dusty rose #E893B2
  'indoor-play': { name: 'Indoor Play', color: '#E893B2' },
  'play-space': { name: 'Play Space', color: '#E893B2' },
  'indoor-playground': { name: 'Indoor Playground', color: '#E893B2' },
  'activity-center': { name: 'Activity Center', color: '#E893B2' },

  // Entertainment group - Muted yellow #F9D056
  'entertainment': { name: 'Entertainment', color: '#F9D056' },
  'movies': { name: 'Movies', color: '#F9D056' },
  'theme-park': { name: 'Theme Parks', color: '#F9D056' },
  'event-space': { name: 'Event Spaces', color: '#F9D056' },
  'theater': { name: 'Theater', color: '#F9D056' },

  // Camps group - Periwinkle blue #80A4ED
  'camp': { name: 'Camps', color: '#80A4ED' },
  'summer-camp': { name: 'Summer Camp', color: '#80A4ED' },
  'easter-camp': { name: 'Easter Camp', color: '#80A4ED' },
  'day-camp': { name: 'Day Camp', color: '#80A4ED' },

  // Nature group - Forest green #7CB342
  'nature': { name: 'Nature', color: '#7CB342' },
  'beach': { name: 'Beaches', color: '#7CB342' },
  'hike': { name: 'Hiking', color: '#7CB342' },
  'garden': { name: 'Garden', color: '#7CB342' },

  // Food group - Soft coral #E57373
  'restaurant': { name: 'Restaurants', color: '#E57373' },
  'cafe': { name: 'Cafes', color: '#E57373' },
  'food-court': { name: 'Food Court', color: '#E57373' },

  // Accommodation group - Muted purple #9575CD
  'hotel': { name: 'Hotel', color: '#9575CD' },
  'resort': { name: 'Resort', color: '#9575CD' },
  'villa': { name: 'Villa', color: '#9575CD' }
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
  'learning': {
    name: 'Learning',
    color: '#6BAAD4', // Soft blue
    types: ['music', 'language', 'arts', 'drama', 'history', 'stem', 'animals', 'education']
  },
  'sports': {
    name: 'Sports',
    color: '#4F6490', // Muted navy
    types: ['sports', 'martial-arts', 'soccer', 'basketball', 'tennis', 'horseback-riding', 'dance', 'gymnastics', 'yoga', 'swim']
  },
  'outdoor-play': {
    name: 'Outdoor Play',
    color: '#8BC34A', // Soft green
    types: ['outdoor-play', 'playground']
  },
  'indoor-play': {
    name: 'Indoor Play',
    color: '#E893B2', // Dusty rose
    types: ['indoor-play', 'play-space']
  },
  'entertainment': {
    name: 'Entertainment',
    color: '#F9D056', // Muted yellow
    types: ['movies', 'theme-park', 'event-space', 'entertainment']
  },
  'camps': {
    name: 'Camps',
    color: '#80A4ED', // Periwinkle blue
    types: ['camp', 'summer-camp', 'easter-camp']
  },
  'nature': {
    name: 'Nature',
    color: '#7CB342', // Forest green
    types: ['nature', 'beach', 'hike']
  },
  'food': {
    name: 'Food',
    color: '#E57373', // Soft coral
    types: ['restaurant', 'cafe']
  },
  'accommodation': {
    name: 'Accommodation',
    color: '#9575CD', // Muted purple
    types: ['hotel', 'resort']
  }
};