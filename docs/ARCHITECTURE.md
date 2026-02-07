# Restaurant Management Platform - Architecture Documentation

## Overview

This document provides a comprehensive architectural overview of the Restaurant Management Platform, a full-stack web application designed for single-restaurant operations. The platform combines a Next.js 14 frontend with a Django REST Framework backend, providing both public-facing website features and administrative management capabilities.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Component Overview](#component-overview)
3. [Data Flow](#data-flow)
4. [Authentication Flow](#authentication-flow)
5. [Database Architecture](#database-architecture)
6. [API Design Principles](#api-design-principles)
7. [Security Architecture](#security-architecture)
8. [Scalability Considerations](#scalability-considerations)
9. [Deployment Architecture](#deployment-architecture)
10. [Technology Choices Rationale](#technology-choices-rationale)

---

## System Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Client Layer                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │   Web Browser       │    │   Mobile Browser    │    │   Admin Users   │  │
│  │   (Public Site)     │    │   (Public Site)     │    │   (Dashboard)   │  │
│  └──────────┬──────────┘    └──────────┬──────────┘    └────────┬────────┘  │
└─────────────┼──────────────────────────┼────────────────────────┼───────────┘
              │                          │                        │
              │ HTTPS                    │ HTTPS                  │ HTTPS
              │                          │                        │
┌─────────────┼──────────────────────────┼────────────────────────┼───────────┐
│             ▼                          ▼                        ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Nginx Reverse Proxy                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │ SSL Termination │  │ Static Files    │  │ Reverse Routing     │  │   │
│  │  │ (Let's Encrypt) │  │ (/static, /media│  │ (/api → Backend)    │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────┬───────────────────────────┘   │
│                                            │                                │
└────────────────────────────────────────────┼────────────────────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                 │
                    ▼                                                 ▼
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│         Frontend (Next.js 14)       │    │          Backend (Django)           │
│  ┌─────────────────────────────┐   │    │  ┌─────────────────────────────┐   │
│  │     Server Components       │   │    │  │    Django REST Framework    │   │
│  │  - SSR for SEO/pages        │   │    │  │  ┌─────────────────────┐    │   │
│  │  - Static generation        │   │    │  │  │  JWT Authentication │    │   │
│  ├─────────────────────────────┤   │    │  │  ├─────────────────────┤    │   │
│  │     Client Components       │   │    │  │  │  RBAC Permissions   │    │   │
│  │  - React Query (data)       │   │    │  │  ├─────────────────────┤    │   │
│  │  - Interactive UI           │   │    │  │  │  API Endpoints      │    │   │
│  ├─────────────────────────────┤   │    │  │  ├─────────────────────┤    │   │
│  │     Axios + React Query     │   │    │  │  │  Rate Limiting      │    │   │
│  │  - API communication        │   │    │  │  ├─────────────────────┤    │   │
│  │  - Caching & invalidation   │   │    │  │  │  Background Tasks   │    │   │
│  └─────────────────────────────┘   │    │  │  │  (Django Q)         │    │   │
└──────────────────┬──────────────────┘    │  │  └─────────────────────┘    │   │
                   │                       │  └─────────────────────────────┘   │
                   │ HTTP/JSON              └────────────────┬─────────────────┘
                   │                                          │
                   └──────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                     │
                    ▼                                                     ▼
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│      PostgreSQL (Primary DB)        │    │           Redis (Cache/Queue)       │
│  ┌─────────────────────────────┐   │    │  ┌─────────────────────────────┐   │
│  │  Restaurant Data           │   │    │  │  Session Cache              │   │
│  │  - Configurations          │   │    │  │  - JWT blacklists          │   │
│  │  - Menus & Items           │   │    │  │  - Rate limit counters     │   │
│  │  - Blog Posts              │   │    │  │                             │   │
│  ├─────────────────────────────┤   │    │  ├─────────────────────────────┤   │
│  │  Reservations              │   │    │  │  Django Q Task Queue        │   │
│  │  - Guest Information       │   │    │  │  - Email notifications     │   │
│  │  - Booking History         │   │    │  │  - Image processing        │   │
│  ├─────────────────────────────┤   │    │  │  - Report generation       │   │
│  │  User Management           │   │    │  │                             │   │
│  │  - Staff Accounts          │   │    │  └─────────────────────────────┘   │
│  │  - Role Permissions        │   │    │                                    │
│  │  - Audit Logs              │   │    │  ┌─────────────────────────────┐   │
│  └─────────────────────────────┘   │    │  │  Celery (Optional)          │   │
└─────────────────────────────────────┘    │  │  - Heavy background tasks   │   │
                                           │  └─────────────────────────────┘   │
                                           └─────────────────────────────────────┘
```

### Architecture Pattern: API-First with SSR Frontend

The platform follows an **API-first architecture** with a clear separation of concerns:

- **Frontend**: Handles all UI rendering, routing, and user interactions
- **Backend**: Provides stateless REST API with business logic and data persistence
- **Database**: Single source of truth for all application data
- **Cache/Queue**: Performance optimization and async processing

---

## Component Overview

### 1. Frontend (Next.js 14)

**Role**: User interface layer, handling all rendering and client-side interactivity

#### Public Pages (Server-Side Rendered)
- **Home**: Restaurant overview, featured items, quick actions
- **Menu**: Dynamic menu display with categories and dietary filters
- **Gallery**: Image showcase with lazy loading
- **Blog**: Content-rich pages with TipTap-rendered HTML
- **About**: Restaurant story, hours, location information
- **Contact**: Contact form with validation
- **Reservations**: Booking interface with availability checking

#### Admin Dashboard (Protected Routes)
- **Content Management**: Menu items, blog posts, gallery images
- **Reservation Management**: Calendar view, booking approval, modifications
- **Settings**: Restaurant configuration, reservation settings, business hours
- **User Management**: Staff accounts, role assignments
- **Analytics**: Dashboard with key metrics and reports

#### Technical Implementation
```typescript
// Key architectural patterns in frontend

// 1. Server Components (default in Next.js 14)
// Pages use Server Components for SSR/SSG
async function MenuPage() {
  const menuData = await fetchMenuData(); // Server-side data fetching
  return <MenuDisplay data={menuData} />;
}

// 2. Client Components for interactivity
'use client';
function ReservationForm() {
  const { mutate } = useCreateReservation(); // React Query mutation
  // Interactive form handling
}

// 3. API Client Architecture
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// React Query for server state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    }
  }
});
```

### 2. Backend (Django + Django REST Framework)

**Role**: Business logic layer, data access, authentication, and API endpoints

#### Core Modules

**Authentication & Authorization**
- JWT token-based authentication (access/refresh pattern)
- Role-based access control (RBAC) with custom permissions
- Token blacklisting on logout

**API Layer**
- RESTful endpoints following resource-oriented design
- Consistent response format with pagination
- Comprehensive validation and error handling

**Business Logic**
- Reservation management with approval workflows
- Singleton pattern enforcement for restaurant configuration
- Image processing pipeline (resize, compress, WebP conversion)

**Background Processing**
- Django Q for task queue management
- Email notifications (confirmations, reminders)
- Image optimization and thumbnail generation

#### Code Organization
```python
# Backend structure
restaurant_backend/
├── apps/
│   ├── authentication/      # JWT, user management
│   ├── restaurant/          # Restaurant config, hours, settings
│   ├── menu/                # Menu categories, items, ingredients
│   ├── reservations/        # Bookings, availability, tokens
│   ├── blog/                # Posts, tags, TipTap content
│   ├── gallery/             # Images, albums
│   └── analytics/           # Reports, metrics
├── config/
│   ├── settings/            # Environment-specific settings
│   ├── urls.py              # Main URL routing
│   └── wsgi.py              # WSGI entry point
├── core/
│   ├── permissions.py       # Custom permission classes
│   ├── pagination.py        # Custom pagination
│   ├── exceptions.py        # Custom exceptions
│   └── middleware.py        # Custom middleware
└── utils/
    ├── image_processing.py  # Image optimization
    ├── email.py             # Email templates & sending
    └── tokens.py            # Secure token generation
```

### 3. Database (PostgreSQL)

**Role**: Primary data persistence with ACID compliance and complex relationships

#### Schema Design Principles
- Normalized structure with strategic denormalization for performance
- Proper indexing on frequently queried fields
- Foreign key constraints for data integrity
- JSONB fields for flexible content (TipTap editor output)

#### Key Entities
- **Restaurant**: Singleton configuration (enforced at application level)
- **ReservationSettings**: Business rules for bookings
- **MenuCategory/MenuItem**: Hierarchical menu structure
- **Reservation**: Guest bookings with token-based management
- **BlogPost**: Content with JSON storage for rich text
- **User**: Staff accounts with role-based permissions

### 4. Cache & Queue (Redis)

**Role**: Performance optimization and asynchronous task processing

#### Redis Usage Patterns

**Caching Layer**
- JWT token blacklist checking (O(1) lookup)
- Rate limit counter storage
- Session data for admin users
- Frequently accessed data (menu, hours)

**Task Queue (Django Q)**
- Asynchronous email sending
- Image processing pipeline
- Report generation
- Scheduled cleanup tasks

### 5. Reverse Proxy (Nginx)

**Role**: Edge layer handling SSL, static files, and request routing

#### Responsibilities
- SSL/TLS termination with automatic certificate renewal (Let's Encrypt)
- Static file serving (Next.js build output, uploaded media)
- Reverse proxy to Next.js and Django backends
- Rate limiting at edge (additional layer)
- Security headers (HSTS, CSP, X-Frame-Options)

---

## Data Flow

### 1. Public Site Request Flow

```
User Request (e.g., /menu)
        │
        ▼
┌───────────────┐
│    Nginx      │ ← SSL termination, security headers
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Next.js     │ ← Server Component renders page
│   (Server)    │ ← Fetches data from API
└───────┬───────┘
        │ HTTP GET /api/menu/
        ▼
┌───────────────┐
│    Django     │ ← Validates request, queries DB
│    (DRF)      │ ← Returns JSON response
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Executes optimized query
└───────────────┘
        │
        ▲
┌───────┴───────┐
│   Next.js     │ ← Receives data, renders HTML
│   (Server)    │ ← Sends complete page to user
└───────────────┘
        │
        ▼
User receives fully-rendered page with data
```

**Key Points**:
- SSR provides SEO benefits and fast initial load
- Data fetched server-side reduces client-side JavaScript
- API responses cached at multiple levels (React Query, HTTP cache)

### 2. Admin Dashboard Flow

```
Admin User Action (e.g., create menu item)
        │
        ▼
┌───────────────┐
│   Next.js     │ ← Client Component handles form
│   (Client)    │ ← React Query manages mutation
└───────┬───────┘
        │ HTTP POST /api/menu/items/
        │ Authorization: Bearer <access_token>
        ▼
┌───────────────┐
│    Django     │ ← JWT validation
│    (DRF)      │ ← Permission check (editor/admin)
│               │ ← Data validation
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Transaction: insert new record
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Django     │ ← Returns 201 Created
│               │ ← Invalidates relevant caches
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Next.js     │ ← React Query updates cache
│   (Client)    │ ← UI updates optimistically
└───────────────┘
        │
        ▼
Admin sees updated menu in real-time
```

**Key Points**:
- JWT tokens sent with every authenticated request
- Permission checks at middleware and view levels
- Optimistic UI updates for responsive experience

### 3. Reservation Creation Flow

```
Guest creates reservation
        │
        ▼
┌───────────────┐
│   Next.js     │ ← Client validates form
│   (Client)    │ ← Checks availability via API
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Django     │ ← Availability check endpoint
│    (DRF)      │ ← Queries existing reservations
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Aggregate query for time slot
└───────────────┘
        │
        ▲
┌───────┴───────┐
│    Django     │ ← Returns availability slots
└───────────────┘
        │
        ▼
Guest selects time, submits reservation
        │
        ▼
┌───────────────┐
│    Django     │ ← Validates all constraints
│    (DRF)      │ ← Hybrid approval logic:
│               │   IF triggers_match THEN pending
│               │   ELSE auto_approve
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Insert with transaction
│               │   - Reservation record
│               │   - Management token (UUID)
│               │   - Guest token (UUID)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Django Q   │ ← Enqueue async tasks:
│   (Redis)     │   - Confirmation email
│               │   - Admin notification (if pending)
└───────────────┘
        │
        ▼
Guest receives confirmation page with:
- Reservation details
- Secure link to modify/cancel (30-day expiry)
```

**Key Points**:
- Real-time availability checking prevents double-booking
- Hybrid approval balances automation with control
- Secure tokens allow guest self-service without accounts
- Async processing keeps request responsive

### 4. Guest Self-Service Flow (Modify/Cancel)

```
Guest clicks link in email
/example.com/reservations/manage?token=abc123
        │
        ▼
┌───────────────┐
│   Next.js     │ ← Extracts token from URL
│   (Client)    │ ← Validates token format
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Django     │ ← GET /api/reservations/validate/
│    (DRF)      │ ← Checks token validity & expiry
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Query with token hash
└───────────────┘
        │
        ▲
┌───────┴───────┐
│    Django     │ ← Returns reservation data
│               │   OR 404 if invalid/expired
└───────────────┘
        │
        ▼
Guest views reservation details
        │
        ▼
Guest modifies or cancels
        │
        ▼
┌───────────────┐
│    Django     │ ← Validates token again
│    (DRF)      │ ← Processes modification
│               │ ← Or soft-deletes (cancel)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PostgreSQL   │ ← Update with transaction
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Django Q   │ ← Enqueue notification email
└───────────────┘
```

---

## Authentication Flow

### JWT Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    JWT Authentication Flow                       │
└─────────────────────────────────────────────────────────────────┘

1. INITIAL LOGIN
┌─────────┐                          ┌──────────┐         ┌──────────┐
│  User   │ ────── POST /api/auth/ ──────▶ │  Django  │ ───────▶ │ PostgreSQL│
│         │  {username, password}          │          │          │           │
│         │                          │          │ ◀──────  │   (validate)│
│         │ ◀────── {access, refresh} ───── │          │          │           │
└─────────┘                          └──────────┘         └──────────┘
                                         │
                                         ▼
                                    ┌──────────┐
                                    │  Redis   │
                                    │ (token   │
                                    │  valid)  │
                                    └──────────┘

2. AUTHENTICATED REQUESTS
┌─────────┐                          ┌──────────┐         ┌──────────┐
│ Next.js │ ───── API Request ──────▶ │  Django  │ ───────▶ │  Redis   │
│         │  Authorization: Bearer    │ Middleware│         │ (check   │
│         │  <access_token>           │          │ ◀──────  │  blacklist)│
│         │                          │          │         └──────────┘
│         │ ◀────── Response ──────── │          │
└─────────┘                          └──────────┘

3. TOKEN REFRESH (access expired)
┌─────────┐                          ┌──────────┐         ┌──────────┐
│ Next.js │ ───── POST /api/auth/ ───▶ │  Django  │ ───────▶ │  Redis   │
│         │  /refresh/                 │          │          │ (validate│
│         │  {refresh_token}           │          │ ◀──────  │  refresh) │
│         │ ◀──── {new_access,         │          │          │           │
│         │      new_refresh}          │          │         └──────────┘
└─────────┘                          └──────────┘

4. LOGOUT (token revocation)
┌─────────┐                          ┌──────────┐         ┌──────────┐
│ Next.js │ ───── POST /api/auth/ ───▶ │  Django  │ ───────▶ │  Redis   │
│         │  /logout/                  │          │          │ (add to  │
│         │  {refresh_token}           │          │          │  blacklist)│
│         │ ◀──── 200 OK ──────────── │          │          │           │
└─────────┘                          └──────────┘         └──────────┘
```

### Token Specifications

**Access Token**
- **Lifetime**: 15 minutes
- **Algorithm**: HS256
- **Payload**: `{user_id, username, roles, iat, exp}`
- **Storage**: Memory only (React Query/Axios interceptors)

**Refresh Token**
- **Lifetime**: 7 days
- **Storage**: HttpOnly cookie (secure, same-site)
- **Rotation**: New refresh token issued on each use
- **Blacklisting**: Stored in Redis on logout

### Permission System

**Roles**
```python
ROLES = {
    'admin': ['manage_users', 'manage_content', 'manage_reservations', 
              'view_analytics', 'manage_settings'],
    'manager': ['manage_content', 'manage_reservations', 'view_analytics'],
    'host': ['manage_reservations', 'view_reservations'],
    'editor': ['manage_content']
}
```

**Permission Enforcement**
- Middleware validates JWT and extracts roles
- View-level decorators check specific permissions
- Object-level permissions for resource ownership
- Frontend role-based UI rendering (defense in depth)

---

## Database Architecture

### Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Restaurant    │────▶│  BusinessHours   │     │   Reservation    │
│    (Singleton)   │     │   (1 per day)    │     │    Settings      │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ PK id            │     │ PK id            │     │ PK id            │
│ name             │     │ FK restaurant_id │     │ FK restaurant_id │
│ description      │     │ day_of_week      │     │ max_guests_per_  │
│ phone            │     │ opening_time     │     │   reservation    │
│ email            │     │ closing_time     │     │ min_advance_time │
│ address          │     │ is_closed        │     │ max_advance_time │
│ social_links     │     │ special_hours    │     │ auto_confirm_    │
│ logo             │     └──────────────────┘     │   threshold      │
│ is_active        │                              │ require_phone    │
└──────────────────┘                              └──────────────────┘
         │                                                 │
         │                                                 │
         ▼                                                 ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   MenuCategory   │     │     MenuItem     │     │  Reservation     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ PK id            │     │ PK id            │     │ PK id            │
│ FK restaurant_id │◀────│ FK category_id   │     │ FK restaurant_id │
│ name             │     │ name             │     │ guest_name       │
│ description      │     │ description      │     │ guest_email      │
│ sort_order       │     │ price            │     │ guest_phone      │
│ is_active        │     │ dietary_tags     │     │ party_size       │
└──────────────────┘     │ image            │     │ reservation_date │
                         │ is_available     │     │ reservation_time │
                         └──────────────────┘     │ status           │
                                                  │ special_requests │
                                                  │ management_token │
                                                  │ guest_token      │
                                                  │ token_expiry     │
                                                  │ created_at       │
                                                  └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     BlogPost     │     │  GalleryImage    │     │      User        │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ PK id            │     │ PK id            │     │ PK id            │
│ FK author_id     │────▶│ FK album_id (opt)│     │ username         │
│ title            │     │ title            │     │ email            │
│ slug (unique)    │     │ image_original   │     │ password_hash    │
│ content_json     │     │ image_thumbnail  │     │ role             │
│ content_html     │     │ image_webp       │     │ is_active        │
│ excerpt          │     │ caption          │     │ last_login       │
│ featured_image   │     │ sort_order       │     └──────────────────┘
│ status           │     │ is_active        │              │
│ published_at     │     └──────────────────┘              │
│ meta_description │                                        │
└──────────────────┘                                        │
                                                            │
                                                   ┌────────┴────────┐
                                                   │  AuditLog       │
                                                   ├─────────────────┤
                                                   │ PK id           │
                                                   │ FK user_id      │
                                                   │ action          │
                                                   │ resource_type   │
                                                   │ resource_id     │
                                                   │ details (JSON)  │
                                                   │ ip_address      │
                                                   │ created_at      │
                                                   └─────────────────┘
```

### Key Design Patterns

**1. Singleton Pattern (Application-Level)**
```python
# Restaurant and ReservationSettings enforce single instance
class Restaurant(models.Model):
    # ... fields ...
    
    def save(self, *args, **kwargs):
        if not self.pk and Restaurant.objects.exists():
            raise ValidationError("Only one restaurant configuration allowed")
        super().save(*args, **kwargs)
```

**2. JSONB for Flexible Content**
```python
# Blog posts store TipTap JSON structure
class BlogPost(models.Model):
    content_json = models.JSONField()  # TipTap document format
    content_html = models.TextField()  # Pre-rendered for display
```

**3. Soft Deletes**
```python
# Reservations use soft delete for record keeping
class Reservation(models.Model):
    is_cancelled = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    # Not actually deleted, preserves history
```

**4. Token-Based Access**
```python
# UUID tokens for guest management
class Reservation(models.Model):
    management_token = models.UUIDField(default=uuid.uuid4, unique=True)
    guest_token = models.UUIDField(default=uuid.uuid4, unique=True)
    token_expiry = models.DateTimeField(
        default=lambda: timezone.now() + timedelta(days=30)
    )
```

### Indexing Strategy

```sql
-- High-frequency queries
CREATE INDEX idx_reservation_date_time ON reservations 
    (reservation_date, reservation_time) 
    WHERE is_cancelled = false;

CREATE INDEX idx_reservation_status ON reservations (status) 
    WHERE status IN ('pending', 'confirmed');

CREATE INDEX idx_reservation_token ON reservations (guest_token) 
    WHERE token_expiry > NOW();

-- Menu queries
CREATE INDEX idx_menu_category_order ON menu_categories (sort_order) 
    WHERE is_active = true;

CREATE INDEX idx_menu_item_category ON menu_items (category_id, sort_order) 
    WHERE is_available = true;

-- Blog queries
CREATE INDEX idx_blog_published ON blog_posts (published_at) 
    WHERE status = 'published';

CREATE INDEX idx_blog_slug ON blog_posts (slug);
```

---

## API Design Principles

### RESTful Resource Structure

```
/api/v1/
├── auth/
│   ├── POST /login/                    # Obtain tokens
│   ├── POST /refresh/                  # Refresh access token
│   ├── POST /logout/                   # Revoke refresh token
│   └── GET  /me/                       # Current user info
│
├── restaurant/
│   ├── GET    /                        # Restaurant details (public)
│   ├── GET    /hours/                  # Business hours (public)
│   ├── PUT    /                        # Update restaurant (admin)
│   └── PUT    /hours/                  # Update hours (admin)
│
├── menu/
│   ├── GET    /categories/             # List categories (public)
│   ├── GET    /categories/<id>/        # Category details (public)
│   ├── GET    /items/                  # List items (public)
│   ├── GET    /items/<id>/             # Item details (public)
│   ├── POST   /categories/             # Create category (editor+)
│   ├── POST   /items/                  # Create item (editor+)
│   ├── PUT    /categories/<id>/        # Update category (editor+)
│   ├── PUT    /items/<id>/             # Update item (editor+)
│   └── DELETE /items/<id>/             # Delete item (editor+)
│
├── reservations/
│   ├── GET    /availability/           # Check slots (public)
│   ├── POST   /                        # Create reservation (public)
│   ├── GET    /                        # List reservations (host+)
│   ├── GET    /<id>/                   # Reservation details (auth)
│   ├── PUT    /<id>/                   # Update reservation (host+)
│   ├── POST   /<id>/cancel/            # Cancel reservation (token)
│   └── POST   /<id>/confirm/           # Confirm pending (host+)
│
├── blog/
│   ├── GET    /posts/                  # List posts (public)
│   ├── GET    /posts/<slug>/           # Post details (public)
│   ├── POST   /posts/                  # Create post (editor+)
│   ├── PUT    /posts/<id>/             # Update post (editor+)
│   └── DELETE /posts/<id>/             # Delete post (editor+)
│
└── admin/
    ├── GET    /users/                  # List staff (admin)
    ├── POST   /users/                  # Create user (admin)
    ├── GET    /analytics/              # Dashboard metrics (manager+)
    └── GET    /audit-log/              # Activity log (admin)
```

### Response Format

**Success Response**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "name": "Example Item",
    // ... resource fields
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid-v4-string"
  }
}
```

**List Response with Pagination**
```json
{
  "status": "success",
  "data": [
    // ... array of items
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_previous": false
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Enter a valid email address"],
      "party_size": ["Party size exceeds maximum"]
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid-v4-string"
  }
}
```

### API Versioning

- URL-based versioning: `/api/v1/...`
- Backward compatibility maintained for 2 minor versions
- Deprecation notices in response headers: `X-API-Deprecation: 2024-06-01`

### Rate Limiting

```python
# Tiered rate limiting strategy
RATE_LIMITS = {
    # Public endpoints - stricter limits
    'public': {
        'reservation_create': '5/hour',      # Prevent spam
        'availability_check': '30/minute',   # Reasonable browsing
        'contact_form': '3/hour',            # Prevent abuse
    },
    # Authenticated endpoints - generous limits
    'authenticated': {
        'default': '1000/hour',              # Normal usage
        'admin_write': '100/hour',           # Prevent accidents
    },
    # Admin endpoints - monitored
    'admin': {
        'default': '500/hour',
        'bulk_operations': '10/hour',        # Heavy operations
    }
}
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                    │
├─────────────────────────────────────────────────────────────┤
│ • HTTPS only (HSTS enabled)                                  │
│ • TLS 1.3, strong cipher suites                              │
│ • DDoS protection (Cloudflare or similar)                    │
│ • IP-based blocking for abuse                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Application Gateway (Nginx)                         │
├─────────────────────────────────────────────────────────────┤
│ • Rate limiting per IP                                       │
│ • Request size limits                                        │
│ • Security headers (CSP, X-Frame-Options, etc.)              │
│ • WAF rules for common attacks                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Authentication & Authorization                      │
├─────────────────────────────────────────────────────────────┤
│ • JWT with short-lived access tokens                         │
│ • Refresh token rotation                                     │
│ • Token blacklisting on logout                               │
│ • RBAC with principle of least privilege                     │
│ • CORS configured per environment                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Input Validation & Sanitization                     │
├─────────────────────────────────────────────────────────────┤
│ • Strict serializer validation (DRF)                         │
│ • SQL injection prevention (ORM parameterized queries)       │
│ • XSS protection (output encoding, CSP)                      │
│ • File upload validation (type, size, content scan)          │
│ • TipTap content sanitization (DOMPurify)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Data Protection                                     │
├─────────────────────────────────────────────────────────────┤
│ • Database encryption at rest (PostgreSQL TDE)               │
│ • Password hashing (Argon2id)                                │
│ • PII handling compliance (GDPR/CCPA)                        │
│ • Audit logging for sensitive operations                     │
│ • Secure token generation (UUID4, cryptographically secure)  │
└─────────────────────────────────────────────────────────────┘
```

### Security Headers

```nginx
# Nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### CORS Configuration

```python
# Development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
]

# Production
CORS_ALLOWED_ORIGINS = [
    "https://example.com",
    "https://www.example.com",
    "https://admin.example.com",
]

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
    'x-requested-with',
]

CORS_EXPOSE_HEADERS = [
    'x-pagination-total',
    'x-api-deprecation',
]
```

### Secret Management

- **Environment Variables**: All secrets in `.env` (never committed)
- **Django Secret Key**: Rotated quarterly
- **JWT Secret**: Separate from Django secret, rotated on breach suspicion
- **Database Credentials**: Unique per environment, rotated on staff changes
- **Third-party API Keys**: Stored in environment, rotated regularly

---

## Scalability Considerations

### Current Architecture Limits

**Single Restaurant Design**
- Database schema optimized for single-tenant
- No multi-tenancy complexity
- Simpler caching strategies
- Predictable query patterns

**Expected Load**
- Concurrent users: ~50 (public) + ~10 (admin)
- Daily reservations: ~100-500
- API requests: ~10,000/day
- Current architecture suitable for 10x growth

### Scaling Strategies

**1. Horizontal Scaling**
```yaml
# Docker Compose with replicas
services:
  nextjs:
    image: restaurant-frontend
    deploy:
      replicas: 2
    
  django:
    image: restaurant-backend
    deploy:
      replicas: 3
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
    
  nginx:
    image: nginx:alpine
    # Load balancing across backend instances
```

**2. Database Optimization**
```sql
-- Read replicas for reporting
-- Connection pooling (PgBouncer)
-- Query optimization with EXPLAIN ANALYZE
-- Partitioning for historical reservation data (by year)
```

**3. Caching Strategy**
```python
# Multi-layer caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache patterns:
# - Public menu data: 5 minutes
# - Business hours: 1 hour
# - Blog post list: 10 minutes
# - Individual blog posts: 1 hour
# - Reservation availability: 1 minute (time-sensitive)
```

**4. CDN Integration**
- Static assets served from CDN (CloudFront/Cloudflare)
- Image optimization at edge
- Geographic distribution for global users

**5. Database Sharding (Future)**
If scaling beyond single restaurant (SaaS model):
- Shard by restaurant_id
- Separate database per restaurant
- Shared metadata database
- Redis cluster for cache

---

## Deployment Architecture

### Docker Container Setup

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Frontend - Next.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.example.com
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    networks:
      - frontend_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend - Django
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgresql://user:pass@db:5432/restaurant
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    networks:
      - frontend_network
      - backend_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - media_files:/app/media

  # Background Worker - Django Q
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    command: python manage.py qcluster
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgresql://user:pass@db:5432/restaurant
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    networks:
      - backend_network
    volumes:
      - media_files:/app/media

  # Database - PostgreSQL
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=restaurant
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d restaurant"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache & Queue - Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - backend_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Reverse Proxy - Nginx
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - media_files:/var/www/media:ro
      - static_files:/var/www/static:ro
    depends_on:
      - frontend
      - backend
    networks:
      - frontend_network
      - backend_network
    restart: unless-stopped

  # SSL Certificate Management (Let's Encrypt)
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  media_files:
  static_files:

networks:
  frontend_network:
    driver: bridge
  backend_network:
    driver: bridge
    internal: true  # Only internal communication
```

### Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run backend tests
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          pytest
      
      - name: Run frontend tests
        working-directory: ./frontend
        run: |
          npm ci
          npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build
      
      - name: Build images
        run: |
          docker compose -f docker-compose.production.yml build
          docker compose -f docker-compose.production.yml push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/restaurant-platform
            git pull origin main
            docker compose -f docker-compose.production.yml pull
            docker compose -f docker-compose.production.yml up -d
            docker compose -f docker-compose.production.yml exec backend python manage.py migrate
            docker compose -f docker-compose.production.yml exec backend python manage.py collectstatic --noinput
            docker system prune -f
```

### Environment Configuration

```python
# backend/config/settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['api.example.com', 'example.com']

# Security
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Django Q
Q_CLUSTER = {
    'name': 'DjangoORM',
    'workers': 4,
    'recycle': 500,
    'timeout': 90,
    'retry': 120,
    'queue_limit': 50,
    'bulk': 10,
    'orm': 'default',
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/restaurant/app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

### Monitoring & Health Checks

```python
# backend/apps/core/views.py
from django.http import JsonResponse
from django.db import connections
from django.core.cache import cache
from django_q.status import Stat

def health_check(request):
    """Comprehensive health check endpoint"""
    status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'checks': {}
    }
    
    # Database check
    try:
        connections['default'].cursor().execute('SELECT 1')
        status['checks']['database'] = 'ok'
    except Exception as e:
        status['checks']['database'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'
    
    # Redis check
    try:
        cache.set('health_check', 'ok', 1)
        status['checks']['redis'] = 'ok'
    except Exception as e:
        status['checks']['redis'] = f'error: {str(e)}'
        status['status'] = 'unhealthy'
    
    # Django Q check
    try:
        stats = Stat.get_all()
        status['checks']['task_queue'] = {
            'status': 'ok',
            'clusters': len(stats),
            'workers': sum(s.workers for s in stats)
        }
    except Exception as e:
        status['checks']['task_queue'] = f'error: {str(e)}'
    
    status_code = 200 if status['status'] == 'healthy' else 503
    return JsonResponse(status, status=status_code)
```

---

## Technology Choices Rationale

### 1. Next.js 14 (Frontend)

**Why Next.js?**
- **Server Components**: Zero-JS SSR for SEO-critical pages (menu, blog)
- **App Router**: Simplified routing with nested layouts
- **Image Optimization**: Automatic WebP/AVIF conversion, lazy loading
- **API Routes**: Serverless functions for edge processing
- **Developer Experience**: Fast refresh, TypeScript support

**Why Not?**
- Alternatives: Remix (good, less mature ecosystem), Gatsby (static-only, less flexible)
- Avoided: Create React App (no SSR, poor SEO)

### 2. Django + DRF (Backend)

**Why Django?**
- **Batteries Included**: Auth, ORM, admin interface out of the box
- **DRF Ecosystem**: Mature REST framework with excellent documentation
- **Security**: Built-in protection against common vulnerabilities
- **ORM**: Powerful, secure database abstraction
- **Admin**: Automatic admin interface for quick management tasks

**Why Not?**
- Alternatives: FastAPI (faster, less mature ecosystem), Flask (more flexible, requires more boilerplate)
- Avoided: Node.js/Express (JavaScript fatigue, callback complexity)

### 3. PostgreSQL (Database)

**Why PostgreSQL?**
- **ACID Compliance**: Data integrity for critical business operations
- **JSONB Support**: Flexible storage for TipTap content
- **Full-Text Search**: Built-in search for blog/menu
- **Extensions**: PostGIS (future location features), pg_trgm (fuzzy search)
- **Reliability**: Battle-tested, excellent tooling

**Why Not?**
- Alternatives: MySQL (similar, less feature-rich), MongoDB (flexible, weaker transactions)
- Avoided: SQLite (not suitable for concurrent production use)

### 4. Redis (Cache/Queue)

**Why Redis?**
- **Speed**: In-memory operations for <1ms response times
- **Versatility**: Caching, session storage, pub/sub, task queues
- **Django Q Integration**: Native support for background processing
- **Persistence**: AOF/RDB for durability

**Why Not?**
- Alternatives: Memcached (simpler, less features), RabbitMQ (more robust for queues, overkill)
- Avoided: Database-based queues (slower, locks issues)

### 5. Nginx (Reverse Proxy)

**Why Nginx?**
- **Performance**: Event-driven, handles 10k+ concurrent connections
- **Static Files**: Efficient file serving with sendfile
- **SSL**: Easy Let's Encrypt integration
- **Load Balancing**: Built-in upstream configuration

**Why Not?**
- Alternatives: Caddy (simpler config, less mature), Traefik (container-native)
- Avoided: Apache (process-based, heavier resource usage)

### 6. Docker (Containerization)

**Why Docker?**
- **Consistency**: Same environment dev/staging/production
- **Isolation**: Service separation without VM overhead
- **Scalability**: Easy horizontal scaling with docker-compose
- **CI/CD**: Standardized build artifacts

**Why Not?**
- Alternatives: Kubernetes (overkill for single restaurant), Podman (Docker alternative, similar benefits)
- Avoided: Direct server deployment (configuration drift, harder rollbacks)

### 7. TipTap (Rich Text Editor)

**Why TipTap?**
- **JSON Output**: Structured content, not messy HTML
- **Extensibility**: Easy to add custom nodes/marks
- **Collaboration**: ProseMirror foundation supports real-time (future)
- **Framework Agnostic**: Works with any frontend

**Why Not?**
- Alternatives: Quill (simpler, less extensible), Slate (React-only, steeper learning curve)
- Avoided: TinyMCE (proprietary, expensive), CKEditor (heavy, complex)

---

## Conclusion

This architecture provides a robust, scalable foundation for a single-restaurant management platform. The separation of concerns between Next.js (presentation), Django (business logic), and PostgreSQL (data) enables independent scaling and maintenance of each layer.

Key architectural strengths:
1. **API-first design** enables future mobile app development
2. **Hybrid approval system** balances automation with human oversight
3. **Token-based guest management** provides secure self-service without account friction
4. **Singleton configuration pattern** ensures data consistency
5. **Defense-in-depth security** protects against common vulnerabilities

The system is designed to handle 10x growth without architectural changes, with clear migration paths if the business model evolves to multi-tenancy or SaaS.

---

## Appendix: Glossary

- **DRF**: Django REST Framework
- **SSR**: Server-Side Rendering
- **JWT**: JSON Web Token
- **RBAC**: Role-Based Access Control
- **CORS**: Cross-Origin Resource Sharing
- **CSRF**: Cross-Site Request Forgery
- **XSS**: Cross-Site Scripting
- **ORM**: Object-Relational Mapping
- **ACID**: Atomicity, Consistency, Isolation, Durability
- **CDN**: Content Delivery Network
- **WAF**: Web Application Firewall
- **PII**: Personally Identifiable Information
- **TDE**: Transparent Data Encryption
