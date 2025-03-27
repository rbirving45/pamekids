// src/types/location.ts
import { ACTIVITY_CATEGORIES } from '../utils/metadata';

// Derive the ActivityType from the keys of ACTIVITY_CATEGORIES
export type ActivityType = keyof typeof ACTIVITY_CATEGORIES;

export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: ActivityType[];
  primaryType?: ActivityType;
  description: string;
  address: string;
  ageRange: {
    min: number;
    max: number;
  };
  priceRange?: string;
  openingHours: Record<string, string>;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  placeData?: {
    rating?: number;
    userRatingsTotal?: number;
    photos?: google.maps.places.PlacePhoto[];
    photoUrls?: string[];
    storedPhotoUrls?: string[]; // Permanent Firebase Storage URLs
    photoReferences?: string[]; // Google Places photo references for attribution
    last_fetched?: string; // ISO string timestamp for when the data was fetched
    hours?: Record<string, string>;
    phone?: string;
    website?: string;
    address?: string;
  };
  images?: string[];
  featured?: boolean;
  // Pro Tips field - contains insider information for each location
  proTips?: string;
  // Optional timestamps - these won't interfere with existing location processing
  created_at?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  updated_at?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  placeData_updated_at?: {
    seconds: number;
    nanoseconds: number;
  } | null;
}