/**
 * Blog post data structure for PameKids blog
 */

// Basic author information
export interface Author {
  name: string;
  bio?: string;
  avatar?: string;
  role?: string;
}

// Image with various sizes for responsive display
export interface BlogImage {
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
}

// Structure for individual blog posts
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: Author;
  publishDate: string; // ISO date string
  updatedDate?: string; // ISO date string
  mainImage?: BlogImage;
  images?: BlogImage[];
  summary: string;
  content: string; // Can be Markdown or HTML
  readingTime?: number; // In minutes
  tags?: string[];
  categories?: string[];
  relatedPosts?: string[]; // IDs of related posts
}