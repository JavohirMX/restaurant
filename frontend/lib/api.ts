import axios, { AxiosError, AxiosInstance } from 'axios';

// Use internal Docker network URL for server-side, public URL for client-side
const getBaseUrl = () => {
  // Check if we're running on the server (window is undefined during SSR)
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.API_BASE_URL || 'http://backend:8000/api/v1';
  }
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Response types
export interface RestaurantInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  location: {
    address_line1: string;
    address_line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    google_maps_embed_url?: string;
    geo?: { lat: number; lng: number };
  };
  social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    x?: string;
    youtube?: string;
    website?: string;
  };
  branding: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  settings: {
    timezone: string;
    ga4_measurement_id?: string;
  };
}

export interface ServicePeriod {
  id: string;
  name: string;
  weekday: number;
  weekday_display: string;
  opens_at: string;
  closes_at: string;
}

export interface HoursResponse {
  timezone: string;
  service_periods: ServicePeriod[];
}

export interface GalleryImage {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
}

export interface GalleryResponse {
  images: GalleryImage[];
}

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  sort_order: number;
}

export interface TestimonialsResponse {
  testimonials: Testimonial[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  published_at: string;
  is_published: boolean;
  cover_image_url?: string;
}

export interface BlogPostDetail extends BlogPost {
  body_html: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  next?: string;
  previous?: string;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price_cents: number;
  price_display: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  photos: { url: string }[];
  sort_order: number;
  variants: MenuItemVariant[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
}

export interface AvailabilitySlot {
  starts_at: string;
  available: boolean;
  remaining_capacity: number;
  requires_approval: boolean;
}

export interface AvailabilityResponse {
  date: string;
  slot_interval_minutes: number;
  slots: AvailabilitySlot[];
}

export interface GuestInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateReservationRequest {
  party_size: number;
  starts_at: string;
  guest: GuestInfo;
  notes?: string;
  website?: string; // honeypot field
}

export interface Reservation {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  party_size: number;
  starts_at: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  notes?: string;
}

export interface ReservationToken {
  token: string;
  expires_at: string;
  is_valid?: boolean;
}

export interface CreateReservationResponse {
  reservation: Reservation;
  token: ReservationToken;
}

export interface ReservationDetailResponse {
  reservation: Reservation & {
    ends_at?: string;
    notes?: string;
  };
  token: ReservationToken;
}

// API functions
export async function getRestaurantInfo(): Promise<RestaurantInfo> {
  const response = await apiClient.get<RestaurantInfo>('/public/restaurant/info/');
  return response.data;
}

export async function getHours(): Promise<HoursResponse> {
  const response = await apiClient.get<HoursResponse>('/public/restaurant/hours/');
  return response.data;
}

export async function getGallery(): Promise<GalleryResponse> {
  const response = await apiClient.get<GalleryResponse>('/public/restaurant/gallery/');
  return response.data;
}

export async function getTestimonials(): Promise<TestimonialsResponse> {
  const response = await apiClient.get<TestimonialsResponse>('/public/restaurant/testimonials/');
  return response.data;
}

export async function getBlogPosts(cursor?: string): Promise<BlogListResponse> {
  const params = cursor ? { cursor } : {};
  const response = await apiClient.get<BlogListResponse>('/public/restaurant/blog/', { params });
  return response.data;
}

export async function getBlogPost(slug: string): Promise<BlogPostDetail> {
  const response = await apiClient.get<BlogPostDetail>(`/public/restaurant/blog/${slug}/`);
  return response.data;
}

export async function getMenu(): Promise<MenuResponse> {
  const response = await apiClient.get<MenuResponse>('/public/menu/');
  return response.data;
}

export async function getAvailability(date: string): Promise<AvailabilityResponse> {
  const response = await apiClient.get<AvailabilityResponse>('/public/reservations/availability/', {
    params: { date },
  });
  return response.data;
}

export async function createReservation(
  data: CreateReservationRequest
): Promise<CreateReservationResponse> {
  const response = await apiClient.post<CreateReservationResponse>('/public/reservations/', data);
  return response.data;
}

export async function getReservationByToken(token: string): Promise<ReservationDetailResponse> {
  const response = await apiClient.get<ReservationDetailResponse>(`/public/reservations/${token}/`);
  return response.data;
}

export interface ModifyReservationRequest {
  party_size?: number;
  starts_at?: string;
  guest?: GuestInfo;
  notes?: string;
}

export async function modifyReservation(
  token: string,
  data: ModifyReservationRequest
): Promise<ReservationDetailResponse> {
  const response = await apiClient.patch<ReservationDetailResponse>(`/public/reservations/${token}/modify/`, data);
  return response.data;
}

export async function cancelReservation(
  token: string,
  reason?: string
): Promise<{ reservation: { id: string; status: string }; message: string }> {
  const response = await apiClient.post(`/public/reservations/${token}/cancel/`, { reason });
  return response.data;
}

// Error handling helper
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Check for structured error response
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    // Fall back to status text
    if (error.response?.statusText) {
      return `Request failed: ${error.response.statusText}`;
    }
    return error.message || 'An unexpected error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// Get validation errors from error response
export function getValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof AxiosError && error.response?.data?.error === 'VALIDATION_ERROR') {
    return error.response.data.details || null;
  }
  return null;
}
