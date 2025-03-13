// src/types/location.ts
export type ActivityType = 'indoor-play' | 'outdoor-play' | 'sports' | 'arts' | 'music' | 'education' | 'entertainment';

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
}