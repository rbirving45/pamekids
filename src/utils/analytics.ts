import { ANALYTICS } from './metadata';

// Debug configuration
const DEBUG_CONFIG = {
  // Set to true to enable debug logging of analytics events in console
  enableDebug: false,
  // Set to true to disable sending events to GA (useful for local testing)
  disableSending: false
};

// Enable debug mode via localStorage for development purposes
if (typeof localStorage !== 'undefined') {
  const debugSetting = localStorage.getItem('pamekids_analytics_debug');
  if (debugSetting === 'true') {
    DEBUG_CONFIG.enableDebug = true;
  }
  const disableSetting = localStorage.getItem('pamekids_analytics_disable');
  if (disableSetting === 'true') {
    DEBUG_CONFIG.disableSending = true;
  }
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Check for user consent to analytics
const hasAnalyticsConsent = (): boolean => {
  // Check localStorage for consent preference
  const consentSetting = localStorage.getItem('pamekids_analytics_consent');
  
  // Return true only if explicitly granted (default to false otherwise)
  return consentSetting === 'true';
};

// Initialize Google Analytics with respect for user consent - handles configuration when script is already loaded in index.html
export const initGA = () => {
  // Get measurement ID from centralized metadata
  const measurementId = ANALYTICS.GA_MEASUREMENT_ID;
  
  // Prepare gtag even if we don't have consent (for later use if consent is given)
  if (typeof window.gtag !== 'function') {
    // Provide fallback implementation to prevent errors
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
  }
  
  // Set initial consent state based on user preferences
  if (typeof window.gtag === 'function') {
    const analyticsConsent = hasAnalyticsConsent();
    
    // Update consent mode with user preferences
    window.gtag('consent', 'update', {
      'analytics_storage': analyticsConsent ? 'granted' : 'denied',
      'ad_storage': 'denied', // Always deny ad storage for this app
      'functionality_storage': 'granted', // Allow basic functionality cookies
      'personalization_storage': 'denied', // No personalization
      'security_storage': 'granted' // Allow security-related cookies
    });
    
    // Log consent state for debugging
    console.log(`Analytics consent state: ${analyticsConsent ? 'Granted' : 'Denied'}`);
  }
  
  // Only continue with full GA initialization if we have consent
  if (hasAnalyticsConsent()) {
    // Log successful initialization
    console.log(`Google Analytics initialized with ID: ${measurementId}`);
    
    // Load GA script if not already present and we have consent
    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
      console.log('Loading Google Analytics script with consent');
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
    }
    
    // Configure GA with centralized measurement ID
    if (typeof window.gtag === 'function') {
      // Initialize GA4 with proper configuration
      window.gtag('config', measurementId, {
        send_page_view: true,
        cookie_flags: 'max-age=7200;secure;samesite=none',
        cookie_domain: 'auto',
        cookie_update: true
      });
      
      // Send initial page view for SPA tracking
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    }
  } else {
    console.log('Google Analytics disabled due to user consent preferences');
    // Ensure gtag is still available but acts as a no-op when consent is denied
    DEBUG_CONFIG.disableSending = true;
  }
};

// Function to update analytics consent at runtime
export const updateAnalyticsConsent = (consent: boolean) => {
  // Store the new consent preference
  localStorage.setItem('pamekids_analytics_consent', consent.toString());
  
  // Update consent in Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      'analytics_storage': consent ? 'granted' : 'denied'
    });
    
    // If consent is granted, enable sending
    if (consent) {
      enableAnalyticsSending();
      // Re-initialize GA with new consent
      initGA();
    } else {
      // If consent is withdrawn, disable sending
      disableAnalyticsSending();
    }
    
    console.log(`Analytics consent updated: ${consent ? 'Granted' : 'Denied'}`);
  }
  
  return true;
};

// Throttle events to prevent excessive tracking
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  }) as T;
};

// Queue to batch analytics events
let analyticsQueue: Array<{
  eventName: string;
  params: Record<string, any>;
}> = [];
let analyticsTimeout: ReturnType<typeof setTimeout> | null = null;
let isPageVisible = true;

// Check if page is visible to avoid unnecessary processing when tab is inactive
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    isPageVisible = document.visibilityState === 'visible';
    
    // Process queue immediately when page becomes visible again
    if (isPageVisible && analyticsQueue.length > 0) {
      if (analyticsTimeout) {
        clearTimeout(analyticsTimeout);
      }
      processAnalyticsQueue();
    }
  });
}

// Process analytics queue
const processAnalyticsQueue = () => {
  if (!window.gtag || analyticsQueue.length === 0 || !isPageVisible) {
    analyticsTimeout = null;
    return;
  }
  
  // Take max 10 events at a time to avoid blocking main thread
  const batch = analyticsQueue.splice(0, 10);
  
  // Process each event in the batch
  batch.forEach(item => {
    try {
      // Skip sending to GA if disabled in debug mode
      if (!DEBUG_CONFIG.disableSending) {
        window.gtag('event', item.eventName, item.params);
      }
      
      // Log events in console when debug is enabled
      if (DEBUG_CONFIG.enableDebug) {
        console.log(`📊 Analytics Queue: ${item.eventName}`, item.params);
      }
    } catch {
      // Silently handle any errors in analytics
    }
  });
  
  // If there are more events, schedule another processing
  if (analyticsQueue.length > 0) {
    analyticsTimeout = setTimeout(processAnalyticsQueue, 500);
  } else {
    analyticsTimeout = null;
  }
};

// Helper functions to toggle debug mode at runtime
export const enableAnalyticsDebug = () => {
  DEBUG_CONFIG.enableDebug = true;
  localStorage.setItem('pamekids_analytics_debug', 'true');
  console.log('🔍 Analytics debug mode ENABLED. All events will be logged to console.');
  return true;
};

export const disableAnalyticsDebug = () => {
  DEBUG_CONFIG.enableDebug = false;
  localStorage.setItem('pamekids_analytics_debug', 'false');
  console.log('🔍 Analytics debug mode DISABLED.');
  return true;
};

// Helper functions to toggle sending events to GA
export const disableAnalyticsSending = () => {
  DEBUG_CONFIG.disableSending = true;
  localStorage.setItem('pamekids_analytics_disable', 'true');
  console.log('⚠️ Analytics sending DISABLED. Events will not be sent to Google Analytics.');
  return true;
};

export const enableAnalyticsSending = () => {
  DEBUG_CONFIG.disableSending = false;
  localStorage.setItem('pamekids_analytics_disable', 'false');
  console.log('✅ Analytics sending ENABLED. Events will be sent to Google Analytics.');
  return true;
};

// Add event to analytics queue
const queueAnalyticsEvent = (eventName: string, params: Record<string, any>) => {
  // Don't queue if window or gtag is not available or if user hasn't given consent
  if (typeof window === 'undefined' || !window.gtag || !hasAnalyticsConsent()) return;
  
  analyticsQueue.push({ eventName, params });
  
  // Set timeout to process queue if not already scheduled
  if (!analyticsTimeout && isPageVisible) {
    analyticsTimeout = setTimeout(processAnalyticsQueue, 1000);
  }
};

// Track external link clicks - important conversion event, send immediately
export const trackExternalLink = (
  type: 'website' | 'phone' | 'directions' | 'email' | 'reviews' | 'photos',
  businessName: string,
  url: string,
  locationId?: string,
  source?: 'map' | 'list' | 'search' | 'detail'
) => {
  // Check if gtag is available and if we have consent
  if (!window.gtag || !hasAnalyticsConsent()) return;
  
  const eventParams = {
    event_category: 'External Link',
    event_label: businessName,
    business_name: businessName,
    location_id: locationId || 'unknown', // Include location ID for better reporting
    link_type: type,
    link_url: url,
    interaction_source: source || 'detail', // Track where the interaction originated
    non_interaction: false
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics: ${type}_click`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Important conversion events sent immediately instead of batched
  window.gtag('event', `${type}_click`, eventParams);
};

// Track map marker clicks with throttling to avoid excessive events
export const trackMarkerClick = throttle((
  businessName: string,
  locationId?: string,
  activityTypes?: string[],
  interactionMethod: 'map_click' | 'search_result' | 'list_item' = 'map_click'
) => {
  // Create event parameters with all relevant details
  const eventParams = {
    event_category: 'Map Interaction',
    event_label: businessName,
    business_name: businessName,
    location_id: locationId || 'unknown',
    activity_types: activityTypes ? activityTypes.join(',') : undefined,
    interaction_method: interactionMethod,
    non_interaction: false
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics: marker_click`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent('marker_click', eventParams);
}, 1000); // 1 second throttle

// Keep track of recent searches to avoid duplicates
const recentSearches = new Set<string>();

// Clear recent searches after a time period
setInterval(() => {
  recentSearches.clear();
}, 30 * 60 * 1000); // Clear every 30 minutes

// Track search queries with throttling to avoid excessive events
export const trackSearchQuery = throttle((
  query: string,
  resultCount: number,
  hasActivityFilter: boolean = false,
  hasAgeFilter: boolean = false
) => {
  // Skip if query is too short or empty
  if (!query || query.trim().length < 3) {
    return;
  }
  
  // Create a unique key for this search (including filters)
  const searchKey = `${query}|${hasActivityFilter}|${hasAgeFilter}`;
  
  // Skip if we've tracked this exact search recently
  if (recentSearches.has(searchKey)) {
    if (DEBUG_CONFIG.enableDebug) {
      console.log(`📊 Analytics: Skipped duplicate search for "${query}"`);
    }
    return;
  }
  
  // Add to recent searches
  recentSearches.add(searchKey);
  
  // Only keep the last 50 searches in memory
  if (recentSearches.size > 50) {
    const oldestSearch = recentSearches.values().next().value;
    recentSearches.delete(oldestSearch);
  }
  
  const eventParams = {
    event_category: 'Search',
    event_label: query,
    search_term: query,
    result_count: resultCount,
    has_activity_filter: hasActivityFilter,
    has_age_filter: hasAgeFilter,
    search_length: query.length,
    non_interaction: false
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics: search_query`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent('search_query', eventParams);
}, 2000); // 2000ms (2 second) throttle for searches

// Track search result clicks
export const trackSearchResultClick = (
  query: string,
  resultName: string,
  resultPosition: number,
  locationId?: string,
  activityTypes?: string[]
) => {
  const eventParams = {
    event_category: 'Search',
    event_label: resultName,
    search_term: query,
    result_name: resultName,
    result_position: resultPosition,
    location_id: locationId || 'unknown',
    activity_types: activityTypes ? activityTypes.join(',') : undefined,
    non_interaction: false
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics: search_result_click`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent('search_result_click', eventParams);
};

// Add UTM parameters to URLs
export const addUtmParams = (url: string): string => {
  const utmParams = new URLSearchParams({
    utm_source: 'www.pamekids.com',
    utm_medium: 'referral',
    utm_campaign: 'pame-kids-clicks'
  });

  // Check if URL already has parameters
  const hasParams = url.includes('?');
  return `${url}${hasParams ? '&' : '?'}${utmParams.toString()}`;
};

// Track photo interactions for better reporting on image engagement
export const trackPhotoInteraction = (
  action: 'view' | 'swipe' | 'error' | 'zoom',
  businessName: string,
  locationId?: string,
  photoIndex?: number,
  totalPhotos?: number,
  error?: string
) => {
  const eventParams = {
    event_category: 'Image Interaction',
    event_label: businessName,
    business_name: businessName,
    location_id: locationId || 'unknown',
    photo_action: action,
    photo_index: photoIndex,
    total_photos: totalPhotos,
    error_message: error,
    non_interaction: action === 'view' // 'view' is passive, other actions are interactive
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics: photo_${action}`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent(`photo_${action}`, eventParams);
};

// Generic function for tracking custom events not covered by other tracking functions
export const trackCustomEvent = (
  eventName: string,
  category: string,
  label: string,
  params: Record<string, any> = {},
  nonInteraction: boolean = false
) => {
  // Build complete event parameters
  const eventParams = {
    event_category: category,
    event_label: label,
    ...params,
    non_interaction: nonInteraction
  };
  
  // Debug logging if enabled
  if (DEBUG_CONFIG.enableDebug) {
    console.log(`📊 Analytics Custom: ${eventName}`, eventParams);
  }
  
  // Skip sending to GA if disabled
  if (DEBUG_CONFIG.disableSending) {
    return;
  }
  
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent(eventName, eventParams);
};