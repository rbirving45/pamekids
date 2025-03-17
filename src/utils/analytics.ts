import { ANALYTICS } from './metadata';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics - dynamically loading script
export const initGA = () => {
  // Check if gtag is already defined
  if (typeof window.gtag !== 'function') {
    // Provide fallback implementation to prevent errors
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    // Dynamically load the GA script with our measurement ID
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  // Get measurement ID from centralized metadata
  const measurementId = ANALYTICS.GA_MEASUREMENT_ID;
  
  // Log successful initialization
  console.log(`Google Analytics initialized with ID: ${measurementId}`);
  
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
      window.gtag('event', item.eventName, item.params);
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

// Add event to analytics queue
const queueAnalyticsEvent = (eventName: string, params: Record<string, any>) => {
  // Don't queue if window or gtag is not available
  if (typeof window === 'undefined' || !window.gtag) return;
  
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
  url: string
) => {
  if (!window.gtag) return;
  
  // Important conversion events sent immediately instead of batched
  window.gtag('event', `${type}_click`, {
    event_category: 'External Link',
    event_label: businessName,
    business_name: businessName,
    link_type: type,
    link_url: url,
    non_interaction: false
  });
};

// Track map marker clicks with throttling to avoid excessive events
export const trackMarkerClick = throttle((businessName: string) => {
  // Add to batch queue instead of sending immediately
  queueAnalyticsEvent('marker_click', {
    event_category: 'Map Interaction',
    event_label: businessName,
    business_name: businessName,
    non_interaction: false
  });
}, 1000); // 1 second throttle

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