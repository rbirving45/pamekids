import { Location, ActivityType } from '../types/location';

// Type for activity configuration
type ActivityConfigType = Record<ActivityType, { name: string; color: string }>;

// Interface for search match results
export interface SearchMatch {
  location: Location;
  matchField: string;
  matchText: string;
  matchType: 'exact' | 'partial' | 'semantic';
  priority: number; // 1 is highest priority, higher numbers = lower priority
  ageMatch?: boolean;
  activityMatch?: boolean;
}

// Keywords that might indicate a search for certain activity types
const activityKeywords: Record<ActivityType, string[]> = {
  'indoor-play': ['indoor', 'inside', 'playroom', 'playspace', 'play area', 'play space', 'playground', 'soft play'],
  'outdoor-play': ['outdoor', 'outside', 'playground', 'park', 'garden', 'field', 'nature'],
  'sports': ['sport', 'sports', 'athletic', 'athletics', 'football', 'soccer', 'basketball', 'tennis', 'swimming', 'gym', 'gymnastics', 'dance', 'ballet', 'martial art', 'karate', 'judo', 'taekwondo', 'baseball', 'volleyball'],
  'arts': ['art', 'arts', 'craft', 'crafts', 'drawing', 'painting', 'pottery', 'ceramics', 'sculpture', 'theater', 'theatre', 'drama', 'creative'],
  'music': ['music', 'musical', 'instrument', 'piano', 'guitar', 'violin', 'drums', 'singing', 'choir', 'band', 'orchestra'],
  'education': ['education', 'educational', 'learning', 'learn', 'school', 'class', 'classes', 'workshop', 'academic', 'science', 'stem', 'math', 'reading', 'language', 'coding', 'robotic', 'robotics', 'museum', 'history'],
  'entertainment': ['entertainment', 'fun', 'movie', 'cinema', 'theatre', 'theater', 'show', 'performance', 'amusement', 'arcade', 'game', 'laser tag', 'bowling']
};

/**
 * Extracts age references from a search query
 * @param query The search query
 * @returns An array of ages found in the query, or empty array if none found
 */
export function extractAgesFromQuery(query: string): number[] {
  const ages: number[] = [];
  const uniqueAges = new Set<number>();
  
  // Pattern for "X year old", "X years old", "age X"
  const agePatterns = [
    /\b(\d{1,2})\s*(?:year|years)?\s*(?:old)?\b/gi,
    /\bage\s*(\d{1,2})\b/gi,
    /\b(\d{1,2})\s*(?:yo)\b/gi // For shorthand like "6yo"
  ];
  
  agePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const age = parseInt(match[1], 10);
      if (age >= 0 && age <= 18 && !uniqueAges.has(age)) { // Assuming children's activities for ages 0-18
        uniqueAges.add(age);
        ages.push(age);
      }
    }
  });
  
  return ages; // Already deduplicated during collection
}

/**
 * Extracts potential activity types from a search query
 * @param query The search query
 * @param activityConfig Configuration mapping activity types to display names
 * @returns An array of potentially matching activity types
 */
export function extractActivitiesFromQuery(
  query: string,
  activityConfig: ActivityConfigType
): ActivityType[] {
  const queryLower = query.toLowerCase();
  const matchedTypes: ActivityType[] = [];
  
  // Check if query contains activity display names (e.g., "Indoor Play")
  Object.entries(activityConfig).forEach(([type, config]) => {
    if (queryLower.includes(config.name.toLowerCase())) {
      matchedTypes.push(type as ActivityType);
    }
  });
  
  // Check for activity keywords
  Object.entries(activityKeywords).forEach(([type, keywords]) => {
    if (!matchedTypes.includes(type as ActivityType)) {
      for (const keyword of keywords) {
        // Use word boundary for more precise matching
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(queryLower)) {
          matchedTypes.push(type as ActivityType);
          break;
        }
      }
    }
  });
  
  return matchedTypes;
}

/**
 * Helper to check if a location matches any of the extracted ages
 */
function checkAgeMatch(location: Location, ages: number[]): boolean {
  if (ages.length === 0) return false;
  
  return ages.some(age =>
    age >= location.ageRange.min && age <= location.ageRange.max
  );
}

/**
 * Helper to check if a location matches any of the extracted activity types
 */
function checkActivityMatch(location: Location, activityTypes: ActivityType[]): boolean {
  if (activityTypes.length === 0) return false;
  
  return location.types.some(type => activityTypes.includes(type));
}

/**
 * Performs a comprehensive search across location data
 * @param locations Array of locations to search
 * @param query The search query
 * @param activityConfig Configuration mapping activity types to display names
 * @returns An array of search matches, sorted by relevance
 */
export function performEnhancedSearch(
  locations: Location[],
  query: string,
  activityConfig: ActivityConfigType
): SearchMatch[] {
  if (!query.trim()) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  const matches: SearchMatch[] = [];
  const processedIds = new Set<string>();
  
  // Extract ages and activities from query
  const ages = extractAgesFromQuery(query);
  const activityTypes = extractActivitiesFromQuery(query, activityConfig);
  
  // Process each location to find matches
  locations.forEach(location => {
    // Skip if we already added this location
    if (processedIds.has(location.id)) return;
    
    // Create potential matches for this location - we'll pick the best one later
    const potentialMatches: SearchMatch[] = [];
    
    // Name match (highest priority)
    if (location.name.toLowerCase().includes(queryLower)) {
      potentialMatches.push({
        location,
        matchField: 'name',
        matchText: location.name,
        matchType: location.name.toLowerCase() === queryLower ? 'exact' : 'partial',
        priority: 1,
        ageMatch: checkAgeMatch(location, ages),
        activityMatch: checkActivityMatch(location, activityTypes)
      });
    }
    
    // Activity type match
    if (activityTypes.length > 0 && location.types.some(type => activityTypes.includes(type))) {
      const matchingType = location.types.find(type => activityTypes.includes(type))!;
      const matchText = activityConfig[matchingType].name;
      
      potentialMatches.push({
        location,
        matchField: 'activityType',
        matchText,
        matchType: 'semantic',
        priority: 2,
        ageMatch: checkAgeMatch(location, ages),
        activityMatch: true
      });
    }
    
    // Age range match
    if (ages.length > 0 && checkAgeMatch(location, ages)) {
      potentialMatches.push({
        location,
        matchField: 'ageRange',
        matchText: `Ages ${location.ageRange.min}-${location.ageRange.max}`,
        matchType: 'semantic',
        priority: 3,
        ageMatch: true,
        activityMatch: checkActivityMatch(location, activityTypes)
      });
    }
    
    // Address match
    if (location.address.toLowerCase().includes(queryLower)) {
      potentialMatches.push({
        location,
        matchField: 'address',
        matchText: location.address,
        matchType: 'partial',
        priority: 4,
        ageMatch: checkAgeMatch(location, ages),
        activityMatch: checkActivityMatch(location, activityTypes)
      });
    }
    
    // Description match
    if (location.description.toLowerCase().includes(queryLower)) {
      potentialMatches.push({
        location,
        matchField: 'description',
        matchText: location.description,
        matchType: 'partial',
        priority: 5,
        ageMatch: checkAgeMatch(location, ages),
        activityMatch: checkActivityMatch(location, activityTypes)
      });
    }
    
    // Find best match for this location
    if (potentialMatches.length > 0) {
      // Sort by priority (lowest number first)
      potentialMatches.sort((a, b) => a.priority - b.priority);
      
      // Add the best match to our results
      matches.push(potentialMatches[0]);
      processedIds.add(location.id);
    }
  });
  
  // Sort final matches by:
  // 1. Exact matches first
  // 2. Then by priority
  // 3. Then by age + activity matches
  // 4. Then alphabetically by name
  return matches.sort((a, b) => {
    // Exact matches first
    if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
    if (a.matchType !== 'exact' && b.matchType === 'exact') return 1;
    
    // Then by priority
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Then by combined activity + age matches
    const aMatchScore = (a.ageMatch ? 1 : 0) + (a.activityMatch ? 2 : 0);
    const bMatchScore = (b.ageMatch ? 1 : 0) + (b.activityMatch ? 2 : 0);
    if (aMatchScore !== bMatchScore) return bMatchScore - aMatchScore;
    
    // Finally alphabetically
    return a.location.name.localeCompare(b.location.name);
  });
}