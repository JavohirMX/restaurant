import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// Admin API client with JWT authentication
export const adminApiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Important for refresh token cookie
});

// Token management
let accessToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

// Refresh token function
async function refreshAccessToken(): Promise<string> {
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = axios
    .post(`${API_BASE_URL}/admin/auth/refresh/`, {}, { withCredentials: true })
    .then((response) => {
      const newToken = response.data.access_token;
      setAccessToken(newToken);
      return newToken;
    })
    .catch((error) => {
      clearAccessToken();
      throw error;
    })
    .finally(() => {
      tokenRefreshPromise = null;
    });

  return tokenRefreshPromise;
}

// Request interceptor to add auth header
adminApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
adminApiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adminApiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'manager' | 'host' | 'editor';
  is_active: boolean;
  date_joined: string;
  permissions: {
    is_admin: boolean;
    is_manager: boolean;
    can_manage_reservations: boolean;
    can_manage_content: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await adminApiClient.post('/auth/login/', data);
    setAccessToken(response.data.access_token);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await adminApiClient.post('/auth/logout/');
    clearAccessToken();
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await axios.post(
      `${API_BASE_URL}/admin/auth/refresh/`,
      {},
      { withCredentials: true }
    );
    setAccessToken(response.data.access_token);
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await adminApiClient.get('/auth/me/');
    return response.data;
  },
};

// Menu Types
export interface AdminMenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items_count: number;
  items: AdminMenuItem[];
}

export interface AdminMenuItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  sort_order: number;
  variants_count: number;
  variants: AdminMenuItemVariant[];
}

export interface AdminMenuItemVariant {
  id: string;
  name: string;
  price_cents: number;
  sort_order: number;
}

export interface CreateCategoryRequest {
  name: string;
  sort_order?: number;
}

export interface CreateItemRequest {
  name: string;
  category_id: string;
  description?: string;
  tags?: string[];
  photos?: { url: string }[];
  sort_order?: number;
}

export interface CreateVariantRequest {
  name: string;
  price_cents: number;
  item_id: string;
  sort_order?: number;
}

export interface ReorderRequest {
  ids: string[];
}

// Menu API
export const menuApi = {
  // Categories
  getCategories: async (): Promise<{ categories: AdminMenuCategory[] }> => {
    const response = await adminApiClient.get('/menu/categories/');
    return response.data;
  },

  createCategory: async (data: CreateCategoryRequest): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/menu/categories/', data);
    return response.data;
  },

  updateCategory: async (id: string, data: Partial<CreateCategoryRequest>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/menu/categories/${id}/`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/menu/categories/${id}/`);
  },

  reorderCategories: async (data: ReorderRequest): Promise<{ message: string }> => {
    const response = await adminApiClient.patch('/menu/categories/reorder/', data);
    return response.data;
  },

  // Items
  getItems: async (): Promise<{ items: AdminMenuItem[] }> => {
    const response = await adminApiClient.get('/menu/items/');
    return response.data;
  },

  createItem: async (data: CreateItemRequest): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/menu/items/', data);
    return response.data;
  },

  updateItem: async (id: string, data: Partial<CreateItemRequest>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/menu/items/${id}/`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/menu/items/${id}/`);
  },

  reorderItems: async (data: ReorderRequest): Promise<{ message: string }> => {
    const response = await adminApiClient.patch('/menu/items/reorder/', data);
    return response.data;
  },

  // Variants
  createVariant: async (data: CreateVariantRequest): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/menu/variants/', data);
    return response.data;
  },

  updateVariant: async (id: string, data: Partial<CreateVariantRequest>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/menu/variants/${id}/`, data);
    return response.data;
  },

  deleteVariant: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/menu/variants/${id}/`);
  },

  reorderVariants: async (data: ReorderRequest): Promise<{ message: string }> => {
    const response = await adminApiClient.patch('/menu/variants/reorder/', data);
    return response.data;
  },
};

// Gallery Types
export interface AdminGalleryImage {
  id: string;
  url: string | null;
  alt_text: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

// Gallery API
export const galleryApi = {
  getImages: async (): Promise<{ images: AdminGalleryImage[] }> => {
    const response = await adminApiClient.get('/restaurant/gallery/');
    return response.data;
  },

  createImage: async (data: FormData): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/restaurant/gallery/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateImage: async (id: string, data: Partial<{ alt_text: string; sort_order: number; is_published: boolean }>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/restaurant/gallery/${id}/`, data);
    return response.data;
  },

  deleteImage: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/restaurant/gallery/${id}/`);
  },

  reorderImages: async (data: ReorderRequest): Promise<{ message: string }> => {
    const response = await adminApiClient.patch('/restaurant/gallery/reorder/', data);
    return response.data;
  },
};

// Testimonial Types
export interface AdminTestimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  sort_order: number;
  is_published: boolean;
}

// Testimonial API
export const testimonialApi = {
  getTestimonials: async (): Promise<{ testimonials: AdminTestimonial[] }> => {
    const response = await adminApiClient.get('/restaurant/testimonials/');
    return response.data;
  },

  createTestimonial: async (data: Omit<AdminTestimonial, 'id'>): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/restaurant/testimonials/', data);
    return response.data;
  },

  updateTestimonial: async (id: string, data: Partial<Omit<AdminTestimonial, 'id'>>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/restaurant/testimonials/${id}/`, data);
    return response.data;
  },

  deleteTestimonial: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/restaurant/testimonials/${id}/`);
  },

  reorderTestimonials: async (data: ReorderRequest): Promise<{ message: string }> => {
    const response = await adminApiClient.patch('/restaurant/testimonials/reorder/', data);
    return response.data;
  },
};

// Blog Types
export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface AdminBlogPostDetail extends AdminBlogPost {
  body_json: Record<string, unknown>;
  body_html: string;
  cover_image_url: string | null;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

// Blog API
export const blogApi = {
  getPosts: async (): Promise<{ posts: AdminBlogPost[] }> => {
    const response = await adminApiClient.get('/restaurant/blog/');
    return response.data;
  },

  getPost: async (id: string): Promise<AdminBlogPostDetail> => {
    const response = await adminApiClient.get(`/restaurant/blog/${id}/`);
    return response.data;
  },

  createPost: async (data: { title: string; slug?: string; body_json?: Record<string, unknown>; body_html?: string; seo?: Record<string, unknown> }): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/restaurant/blog/', data);
    return response.data;
  },

  updatePost: async (id: string, data: Partial<{ title: string; slug: string; body_json: Record<string, unknown>; body_html: string; seo: Record<string, unknown> }>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/restaurant/blog/${id}/`, data);
    return response.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/restaurant/blog/${id}/`);
  },

  publishPost: async (id: string): Promise<{ message: string }> => {
    const response = await adminApiClient.post(`/restaurant/blog/${id}/publish/`);
    return response.data;
  },

  unpublishPost: async (id: string): Promise<{ message: string }> => {
    const response = await adminApiClient.delete(`/restaurant/blog/${id}/publish/`);
    return response.data;
  },
};

// Reservation Types
export interface AdminReservation {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  party_size: number;
  starts_at: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  created_at: string;
}

export interface AdminReservationDetail extends AdminReservation {
  ends_at?: string;
  notes?: string;
  updated_at: string;
  token: {
    token: string;
    expires_at: string;
    is_valid: boolean;
  };
}

export interface ReservationFilters {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}

// Reservation API
export const reservationApi = {
  getReservations: async (filters?: ReservationFilters): Promise<{ data: AdminReservation[]; pagination?: { next?: string; previous?: string } }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.q) params.append('q', filters.q);

    const queryString = params.toString();
    const url = queryString ? `/reservations/?${queryString}` : '/reservations/';
    const response = await adminApiClient.get(url);
    return response.data;
  },

  getReservation: async (id: string): Promise<AdminReservationDetail> => {
    const response = await adminApiClient.get(`/reservations/${id}/`);
    return response.data;
  },

  approveReservation: async (id: string): Promise<{ reservation: { id: string; status: string }; message: string }> => {
    const response = await adminApiClient.post(`/reservations/${id}/approve/`);
    return response.data;
  },

  cancelReservation: async (id: string, reason?: string): Promise<{ reservation: { id: string; status: string }; message: string }> => {
    const response = await adminApiClient.post(`/reservations/${id}/cancel/`, { reason });
    return response.data;
  },
};

// Settings Types
export interface ServicePeriod {
  id: string;
  name: string;
  weekday: number;
  weekday_display: string;
  opens_at: string;
  closes_at: string;
}

export interface ReservationSettings {
  slot_interval_minutes: number;
  turn_time_minutes: number;
  max_guests_per_slot: number;
  max_party_size_online: number;
  min_lead_time_minutes: number;
  max_days_ahead: number;
  require_phone: boolean;
  approval_party_size_threshold: number;
  same_day_window_hours: number;
  near_capacity_percent: number;
  approval_windows: Record<string, number>;
  token_expiry_days: number;
}

// Settings API
export const settingsApi = {
  // Hours
  getHours: async (): Promise<{ service_periods: ServicePeriod[] }> => {
    const response = await adminApiClient.get('/restaurant/hours/');
    return response.data;
  },

  createHour: async (data: { name: string; weekday: number; opens_at: string; closes_at: string }): Promise<{ id: string; message: string }> => {
    const response = await adminApiClient.post('/restaurant/hours/', data);
    return response.data;
  },

  updateHour: async (id: string, data: Partial<{ name: string; weekday: number; opens_at: string; closes_at: string }>): Promise<{ message: string }> => {
    const response = await adminApiClient.patch(`/restaurant/hours/${id}/`, data);
    return response.data;
  },

  deleteHour: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/restaurant/hours/${id}/`);
  },

  // Reservation Settings
  getReservationSettings: async (): Promise<ReservationSettings> => {
    const response = await adminApiClient.get('/reservations/settings/');
    return response.data;
  },

  updateReservationSettings: async (data: Partial<ReservationSettings>): Promise<{ message: string; changes: Record<string, { from: unknown; to: unknown }> }> => {
    const response = await adminApiClient.patch('/reservations/settings/', data);
    return response.data;
  },
};
