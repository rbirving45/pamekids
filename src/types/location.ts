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
  created_at?: {
    seconds: number;
    nanoseconds: number;
  };
  updated_at?: {
    seconds: number;
    nanoseconds: number;
  };
}