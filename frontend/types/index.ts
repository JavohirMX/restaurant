// Shared types used across the application

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube';
  url: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'restaurant';
  canonical?: string;
}

export interface ReservationFormData {
  partySize: number;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export type ReservationStep = 'date' | 'time' | 'details' | 'confirmation';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}
