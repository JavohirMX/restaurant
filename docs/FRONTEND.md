# Restaurant Management Platform - Frontend Documentation

## Table of Contents
1. [Frontend Overview & Architecture](#1-frontend-overview--architecture)
2. [Project Structure](#2-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [State Management](#4-state-management)
5. [API Integration](#5-api-integration)
6. [Authentication Flow](#6-authentication-flow)
7. [Page Structure](#7-page-structure)
8. [Component Patterns](#8-component-patterns)
9. [Styling Approach](#9-styling-approach)
10. [Form Handling](#10-form-handling)
11. [Environment Variables](#11-environment-variables)
12. [Build & Deployment](#12-build--deployment)
13. [Development Workflow](#13-development-workflow)

---

## 1. Frontend Overview & Architecture

The Restaurant Management Platform frontend is built with **Next.js 14** using the App Router architecture. It consists of two main applications:

### Public Site
- **Purpose**: Customer-facing website with SEO optimization
- **Rendering Strategy**: Server-Side Rendering (SSR) and Static Site Generation (SSG)
- **Key Features**: Menu display, reservations, blog, gallery, contact

### Admin Dashboard
- **Purpose**: Internal management interface for restaurant staff
- **Rendering Strategy**: Client-Side Rendering (CSR) with React Query
- **Key Features**: JWT authentication, role-based access control, CRUD operations

### Architecture Decisions
- **App Router**: Leverages Next.js 14's file-based routing with nested layouts
- **API Route Rewrites**: All API calls are proxied through `/api/*` to the backend
- **Standalone Output**: Configured for Docker/containerized deployment
- **Image Optimization**: Remote patterns configured for backend media files

---

## 2. Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Home page (public)
│   ├── layout.tsx               # Root layout with metadata
│   ├── globals.css              # Global Tailwind styles + CSS variables
│   ├── api/health/route.ts      # Health check endpoint
│   │
│   ├── (public)/                # Public pages
│   │   ├── about/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── gallery/page.tsx
│   │   ├── menu/page.tsx
│   │   └── reservations/page.tsx
│   │
│   └── admin/                   # Admin dashboard
│       ├── layout.tsx           # Admin layout with auth provider
│       ├── page.tsx             # Admin home/dashboard
│       ├── login/page.tsx       # Login page
│       ├── blog/
│       ├── gallery/
│       ├── menu/
│       ├── reservations/
│       ├── settings/
│       ├── testimonials/
│       └── users/
│
├── components/                  # React components
│   ├── ui/                     # UI primitives (Button, etc.)
│   ├── admin/                  # Admin-specific components
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── error-boundary.tsx
│   ├── loading.tsx
│   ├── footer.tsx
│   ├── navigation.tsx
│   └── providers.tsx           # Global context providers
│
├── lib/                        # Utilities & business logic
│   ├── api.ts                  # Public API client & types
│   ├── admin-api.ts            # Admin API with JWT auth
│   ├── admin-auth.tsx          # Auth context & provider
│   ├── admin-queries.ts        # React Query hooks
│   ├── query-client.ts         # Query client configuration
│   └── utils.ts                # Utility functions
│
├── types/                      # TypeScript type definitions
│   └── index.ts
│
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

### Directory Conventions
- **`app/`**: All pages following Next.js App Router conventions
- **`components/ui/`**: Primitive UI components (Button, Input, etc.)
- **`components/admin/`**: Admin-specific shared components
- **`lib/`**: All business logic, API clients, and utilities
- **`types/`**: Shared TypeScript interfaces

---

## 3. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2.35 | React framework with App Router |
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **TailwindCSS** | 3.4.x | Utility-first CSS |
| **TanStack Query** | 5.90+ | Server state management |
| **Axios** | 1.13+ | HTTP client |
| **React Hook Form** | 7.71+ | Form management |
| **Zod** | 4.3+ | Schema validation |
| **Lucide React** | latest | Icon library |
| **clsx** | 2.x | Conditional classnames |
| **tailwind-merge** | 3.x | Tailwind class merging |

### Key Dependencies Explained

#### TanStack Query (React Query)
- Manages server state with caching, background refetching, and optimistic updates
- Used for all data fetching in the admin dashboard
- Query keys follow pattern: `['admin', 'resource', 'id?']`

#### Axios
- HTTP client with interceptors for request/response handling
- Separate instances for public (`apiClient`) and admin (`adminApiClient`) APIs
- Admin client includes JWT token management and refresh logic

#### React Hook Form + Zod
- Form state management with minimal re-renders
- Zod schemas provide type-safe validation
- `@hookform/resolvers` bridges Zod to React Hook Form

---

## 4. State Management

### Server State: TanStack Query

All server state is managed through React Query with the following patterns:

#### Query Client Configuration

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes (garbage collection)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});
```

#### Query Keys Pattern

```typescript
// Consistent query keys for cache management
export const queryKeys = {
  restaurant: ['restaurant'],
  servicePeriods: ['servicePeriods'],
  gallery: ['gallery'],
  testimonials: ['testimonials'],
  blog: {
    all: ['blog'],
    list: (cursor?: string) => ['blog', 'list', cursor],
    detail: (slug: string) => ['blog', 'detail', slug],
  },
  menu: ['menu'],
  availability: (date: string) => ['availability', date],
  reservation: (token: string) => ['reservation', token],
};
```

#### Query Hooks Example

```typescript
// lib/admin-queries.ts
export const useMenuCategories = () => {
  return useQuery({
    queryKey: ['admin', 'menu', 'categories'],
    queryFn: menuApi.getCategories,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useReservations = (filters?: ReservationFilters) => {
  return useQuery({
    queryKey: ['admin', 'reservations', filters],
    queryFn: () => reservationApi.getReservations(filters),
    staleTime: 30 * 1000,
    refetchInterval: 5000, // Real-time polling for reservations
  });
};
```

#### Mutation Patterns

```typescript
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => {
      // Invalidate and refetch categories after creation
      queryClient.invalidateQueries({ 
        queryKey: ['admin', 'menu', 'categories'] 
      });
    },
  });
};

// Usage in component
const createCategory = useCreateCategory();

const handleSubmit = async (data) => {
  await createCategory.mutateAsync(data);
};
```

### Client State

- **React Context**: Used for authentication state (`AuthProvider`)
- **Local State**: React `useState` for component-level state
- **URL State**: Next.js routing for pagination, filters, and navigation

---

## 5. API Integration

### Public API Client

```typescript
// lib/api.ts
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
```

### Type Definitions

```typescript
// Core types from lib/api.ts
export interface RestaurantInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  location: {
    address_line1: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
  };
  branding: {
    logo_url?: string;
    primary_color?: string;
  };
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string;
}

export interface AvailabilitySlot {
  starts_at: string;
  available: boolean;
  remaining_capacity: number;
  requires_approval: boolean;
}
```

### API Functions

```typescript
// Public API functions
export async function getRestaurantInfo(): Promise<RestaurantInfo> {
  const response = await apiClient.get<RestaurantInfo>('/public/restaurant/');
  return response.data;
}

export async function getMenu(): Promise<MenuResponse> {
  const response = await apiClient.get<MenuResponse>('/public/menu/');
  return response.data;
}

export async function getAvailability(date: string): Promise<AvailabilityResponse> {
  const response = await apiClient.get<AvailabilityResponse>(
    '/public/reservations/availability/',
    { params: { date } }
  );
  return response.data;
}

export async function createReservation(
  data: CreateReservationRequest
): Promise<CreateReservationResponse> {
  const response = await apiClient.post<CreateReservationResponse>(
    '/public/reservations/', 
    data
  );
  return response.data;
}
```

### Error Handling Patterns

```typescript
// lib/api.ts
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    return 'An error occurred. Please try again.';
  }
  return 'An unexpected error occurred.';
}

// Get validation errors for form fields
export function getValidationErrors(error: unknown): Record<string, string[]> | undefined {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.details;
  }
  return undefined;
}
```

### Usage Example

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMenu, createReservation, getErrorMessage } from '@/lib/api';

// Fetch menu
const { data: menu, error, isLoading } = useQuery({
  queryKey: ['menu'],
  queryFn: getMenu,
});

// Create reservation with error handling
const reservationMutation = useMutation({
  mutationFn: createReservation,
  onError: (error) => {
    const message = getErrorMessage(error);
    toast.error(message);
  },
});
```

---

## 6. Authentication Flow

### JWT Authentication Architecture

The admin dashboard uses a dual-token JWT system:
- **Access Token**: Short-lived (15 min), stored in memory, sent in Authorization header
- **Refresh Token**: Long-lived, HTTP-only cookie, used to get new access tokens

### Admin API Client with Auth

```typescript
// lib/admin-api.ts
export const adminApiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Important: enables refresh token cookie
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
```

### Request Interceptor

```typescript
// Add auth header to all requests
adminApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

### Response Interceptor (Token Refresh)

```typescript
// Automatic token refresh on 401
adminApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adminApiClient(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### Auth Context Provider

```typescript
// lib/admin-auth.tsx
'use client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canManageContent: boolean;
  canManageReservations: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // Fetch current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'user'], data.user);
      router.push('/admin');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAccessToken();
      queryClient.clear();
      router.push('/admin/login');
    },
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Role-Based Access Control

```typescript
// Permission hook for protected routes
export function useRequireAuth(
  requireContent = false,
  requireReservations = false,
  requireSettings = false,
  requireAdmin = false
) {
  const { isLoading, isAuthenticated, canManageContent, 
          canManageReservations, canManageSettings, canManageUsers } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (requireAdmin && !canManageUsers) {
      router.push('/admin');
      return;
    }

    // Additional permission checks...
  }, [isLoading, isAuthenticated, /* ... */]);

  return { isLoading };
}
```

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **admin** | Full access including user management |
| **manager** | Settings, reservations, content |
| **host** | Reservations only |
| **editor** | Content (blog, gallery, testimonials) only |

---

## 7. Page Structure

### Public Pages

| Route | Purpose | Data Fetching |
|-------|---------|---------------|
| `/` | Home page with hero, features | `getRestaurantInfo()` |
| `/about` | Restaurant story, team | `getRestaurantInfo()` |
| `/menu` | Full menu display | `getMenu()` |
| `/blog` | Blog post listing | `getBlogPosts()` |
| `/blog/[slug]` | Individual blog post | `getBlogPost(slug)` |
| `/gallery` | Photo gallery grid | `getGallery()` |
| `/reservations` | Reservation booking form | `getAvailability(date)` |
| `/contact` | Contact information & form | `getRestaurantInfo()` |

### Public Page Example

```typescript
// app/menu/page.tsx
import { getMenu } from '@/lib/api';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Menu',
    description: 'Explore our seasonal menu',
  };
}

export default async function MenuPage() {
  const menu = await getMenu();

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">Our Menu</h1>
      {menu.categories.map((category) => (
        <section key={category.id} className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
          {/* Menu items... */}
        </section>
      ))}
    </div>
  );
}
```

### Admin Pages

| Route | Purpose | Access Level |
|-------|---------|--------------|
| `/admin` | Dashboard overview | Any authenticated |
| `/admin/login` | Login page | Public |
| `/admin/menu` | Menu management | Content managers |
| `/admin/blog` | Blog post management | Content managers |
| `/admin/gallery` | Photo gallery management | Content managers |
| `/admin/testimonials` | Testimonial management | Content managers |
| `/admin/reservations` | Reservation management | Reservation managers |
| `/admin/settings/hours` | Operating hours | Settings managers |
| `/admin/settings/reservations` | Reservation settings | Settings managers |
| `/admin/users` | User management | Admin only |

### Admin Page Example

```typescript
// app/admin/menu/page.tsx
'use client';

import { useRequireAuth } from '@/lib/admin-auth';
import { useMenuCategories } from '@/lib/admin-queries';

export default function MenuAdminPage() {
  useRequireAuth(true); // Require content management permission
  
  const { data: categories, isLoading } = useMenuCategories();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Menu Management</h1>
      {/* Menu management UI */}
    </div>
  );
}
```

---

## 8. Component Patterns

### UI Primitives

Located in `components/ui/`, these are building block components:

```typescript
// components/ui/button.tsx
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'focus-visible:outline-none focus-visible:ring-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gray-900 text-white hover:bg-gray-800': variant === 'default',
            'border border-gray-300 hover:bg-gray-100': variant === 'outline',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Shared Components

```typescript
// components/loading.tsx
export function Loading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );
}

// components/error-boundary.tsx
'use client';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Provider Pattern

```typescript
// components/providers.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Admin Layout Pattern

```typescript
// app/admin/layout.tsx
import { AuthProvider } from '@/lib/admin-auth';
import { AdminHeader } from '@/components/admin/header';
import { AdminSidebar } from '@/components/admin/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
```

---

## 9. Styling Approach

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
```

### CSS Variables

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
}
```

### Utility Function (cn)

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for clean className handling
 * 
 * Usage:
 * cn('base-class', condition && 'conditional-class', 'override-class')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Styling Patterns

```typescript
// Example component with Tailwind
function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-gray-200 bg-white p-6 shadow-sm",
      "hover:shadow-md transition-shadow",
      className
    )}>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="text-gray-600">{children}</div>
    </div>
  );
}
```

### Common Tailwind Patterns

| Pattern | Classes |
|---------|---------|
| **Container** | `container mx-auto px-4 py-8` |
| **Card** | `rounded-lg border bg-white p-6 shadow-sm` |
| **Button (Primary)** | `bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-md` |
| **Input** | `border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500` |
| **Loading Spinner** | `animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900` |
| **Error Text** | `text-red-600 text-sm mt-1` |
| **Grid Layout** | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |

---

## 10. Form Handling

### Zod Schema Definition

```typescript
import { z } from 'zod';

// Reservation form schema
export const reservationSchema = z.object({
  party_size: z.number()
    .min(1, 'Party size must be at least 1')
    .max(20, 'Maximum party size is 20'),
  starts_at: z.string()
    .datetime('Invalid date format'),
  guest: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    email: z.string()
      .email('Invalid email address'),
    phone: z.string()
      .optional()
      .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
        message: 'Invalid phone number',
      }),
  }),
  notes: z.string()
    .max(500, 'Notes must be under 500 characters')
    .optional(),
  website: z.string().optional(), // Honeypot field
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
```

### React Hook Form Integration

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reservationSchema, ReservationFormData } from './schema';
import { createReservation, getErrorMessage, getValidationErrors } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export function ReservationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      party_size: 2,
    },
  });

  const mutation = useMutation({
    mutationFn: createReservation,
    onError: (error) => {
      // Handle field-specific errors
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        Object.entries(validationErrors).forEach(([field, messages]) => {
          setError(field as any, { message: messages[0] });
        });
      } else {
        // Show general error toast
        toast.error(getErrorMessage(error));
      }
    },
  });

  const onSubmit = (data: ReservationFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Party Size</label>
        <input
          {...register('party_size', { valueAsNumber: true })}
          type="number"
          className="w-full border rounded-md px-3 py-2"
        />
        {errors.party_size && (
          <p className="text-red-600 text-sm mt-1">{errors.party_size.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          {...register('guest.name')}
          className="w-full border rounded-md px-3 py-2"
        />
        {errors.guest?.name && (
          <p className="text-red-600 text-sm mt-1">{errors.guest.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          {...register('guest.email')}
          type="email"
          className="w-full border rounded-md px-3 py-2"
        />
        {errors.guest?.email && (
          <p className="text-red-600 text-sm mt-1">{errors.guest.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || mutation.isPending}
        className="w-full bg-gray-900 text-white py-2 rounded-md disabled:opacity-50"
      >
        {mutation.isPending ? 'Submitting...' : 'Book Reservation'}
      </button>
    </form>
  );
}
```

### Form with Dynamic Fields

```typescript
// Menu item form with variants
import { useFieldArray, useForm } from 'react-hook-form';

function MenuItemForm() {
  const { control, register } = useForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  return (
    <form>
      {/* Basic fields */}
      <input {...register('name')} placeholder="Item name" />
      
      {/* Dynamic variants */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`variants.${index}.name`)}
              placeholder="Variant name"
            />
            <input
              {...register(`variants.${index}.price_cents`, { valueAsNumber: true })}
              placeholder="Price (cents)"
            />
            <button type="button" onClick={() => remove(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      
      <button
        type="button"
        onClick={() => append({ name: '', price_cents: 0 })}
      >
        Add Variant
      </button>
    </form>
  );
}
```

---

## 11. Environment Variables

### Required Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | Yes |

### Development Setup

Create `.env.local` in the `frontend/` directory:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Production Setup

```bash
# Production environment
NEXT_PUBLIC_API_BASE_URL=https://api.yourrestaurant.com/api/v1
```

### Important Notes

- **Public Variables**: Only `NEXT_PUBLIC_*` variables are exposed to the browser
- **Build-time**: Variables are inlined at build time, not runtime
- **Standalone**: When using `output: 'standalone'`, ensure env vars are available during build

---

## 12. Build & Deployment

### Build Configuration

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',     // Optimized for Docker
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
```

### Build Commands

```bash
# Development
cd frontend
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_BASE_URL` environment variable
- [ ] Configure image remotePatterns for production CDN
- [ ] Update API rewrite destination for production
- [ ] Verify JWT cookie domain settings in backend
- [ ] Enable HTTPS for secure cookie transmission
- [ ] Configure health check endpoint (`/api/health`)

---

## 13. Development Workflow

### Getting Started

```bash
# 1. Clone and install dependencies
cd frontend
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your API URL

# 3. Start development server
npm run dev
```

### Development Server

The development server runs on `http://localhost:3000` with:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- Automatic TypeScript compilation

### Code Organization

```
When adding a new feature:

1. Define types in lib/api.ts or lib/admin-api.ts
2. Add API functions
3. Create React Query hooks in lib/admin-queries.ts (if admin)
4. Create/update components
5. Update/add pages in app/
6. Test with npm run dev
```

### Testing API Integration

```typescript
// Example: Testing a new API function
import { getMenu } from '@/lib/api';

async function testMenu() {
  try {
    const menu = await getMenu();
    console.log('Categories:', menu.categories.length);
    console.log('First category:', menu.categories[0]?.name);
  } catch (error) {
    console.error('API Error:', getErrorMessage(error));
  }
}
```

### Common Tasks

#### Adding a New Admin Page

1. Create page file: `app/admin/new-feature/page.tsx`
2. Add permission check: `useRequireAuth(true)`
3. Use existing query hooks or create new ones
4. Add link to sidebar in `components/admin/sidebar.tsx`

#### Adding a New API Endpoint

1. Add TypeScript interfaces in `lib/api.ts` or `lib/admin-api.ts`
2. Create API function
3. Add React Query hook in `lib/admin-queries.ts` (if needed)
4. Use in components with proper error handling

#### Adding a Form

1. Create Zod schema for validation
2. Set up React Hook Form with zodResolver
3. Use `useMutation` for submission
4. Handle field errors with `getValidationErrors()`
5. Handle general errors with `getErrorMessage()`

### Debugging

#### React Query DevTools

```typescript
// Add to components/providers.tsx for development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| 401 on admin pages | Check JWT token, refresh might be failing |
| Images not loading | Verify remotePatterns in next.config.mjs |
| API not connecting | Check NEXT_PUBLIC_API_BASE_URL and API rewrites |
| Form validation not working | Ensure zodResolver is properly configured |
| Query not refetching | Check query keys match when invalidating |

### Code Style

- **TypeScript**: Strict mode enabled, all functions typed
- **Imports**: Use `@/` path alias for project imports
- **Components**: Forward refs, displayName for debugging
- **Error Handling**: Always use `getErrorMessage()` for user-facing errors
- **Loading States**: Show loading spinners during data fetching

---

## Quick Reference

### Import Patterns

```typescript
// API
import { getMenu, getErrorMessage } from '@/lib/api';
import { menuApi, useAuth } from '@/lib/admin-api';

// Queries
import { useMenuCategories, useCreateCategory } from '@/lib/admin-queries';

// Utils
import { cn, formatDate, formatCurrency } from '@/lib/utils';

// Components
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/loading';
```

### Query Key Patterns

```typescript
// Public queries
['restaurant']
['menu']
['blog', 'list', cursor]
['blog', 'detail', slug]
['availability', date]

// Admin queries (prefixed with 'admin')
['admin', 'user']
['admin', 'menu', 'categories']
['admin', 'menu', 'items']
['admin', 'reservations', filters]
['admin', 'blog', id]
```

### Error Handling Pattern

```typescript
const mutation = useMutation({
  mutationFn: createSomething,
  onError: (error) => {
    // Field errors
    const validationErrors = getValidationErrors(error);
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([field, messages]) => {
        setError(field, { message: messages[0] });
      });
      return;
    }
    
    // General error
    toast.error(getErrorMessage(error));
  },
});
```
