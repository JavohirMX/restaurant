# Database Documentation

## Table of Contents
1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Specifications](#table-specifications)
   - [Core Restaurant Models](#core-restaurant-models)
   - [Reservation Models](#reservation-models)
4. [Design Patterns](#design-patterns)
5. [Indexes and Performance](#indexes-and-performance)
6. [Data Flow Examples](#data-flow-examples)
7. [Migration Guidelines](#migration-guidelines)
8. [Backup and Restore](#backup-and-restore)
9. [Common Query Patterns](#common-query-patterns)
10. [Data Integrity](#data-integrity)

---

## Database Overview

### Technology Stack
- **Database**: PostgreSQL 16
- **ORM**: Django ORM 5.x
- **Connection Pooling**: PgBouncer (production)
- **Charset**: UTF-8

### Architecture
The database is organized into Django apps with clear separation of concerns:
- **`restaurant` app**: Core business information and content
- **`reservations` app**: Reservation management and booking system

### Base Model Pattern
All models inherit from a `BaseModel` providing:
```python
class BaseModel(models.Model):
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
```

### Naming Conventions
- **Tables**: `appname_modelname` (e.g., `restaurant_restaurant`)
- **Indexes**: `tablename_fieldname_idx` or `tablename_composite_idx`
- **Constraints**: `tablename_constraint_name_chk`
- **Foreign Keys**: `tablename_fieldname_fk`

---

## Entity Relationship Diagram

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Restaurant (Singleton)                       │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ name, tagline, description                               │
│    │ phone, email                                             │
│    │ location [JSON]                                          │
│    │ social [JSON]                                            │
│    │ branding [JSON]                                          │
│    │ created_at, updated_at                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:1
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RestaurantSettings                            │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│ FK │ restaurant → Restaurant                                   │
│    │ timezone (America/New_York)                              │
│    │ staff_inbox_email                                        │
│    │ ga4_measurement_id                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ReservationSettings (Singleton)               │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ slot_interval_minutes (30)                               │
│    │ turn_time_minutes (90)                                   │
│    │ max_guests_per_slot (40)                                 │
│    │ max_party_size_online (8)                                │
│    │ min_lead_time_minutes (120)                              │
│    │ max_days_ahead (30)                                      │
│    │ require_phone (True)                                     │
│    │ approval_party_size_threshold (6)                        │
│    │ same_day_window_hours (4)                                │
│    │ near_capacity_percent (85)                               │
│    │ approval_windows [JSON]                                  │
│    │ token_expiry_days (30)                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         ServicePeriod                            │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│ FK │ restaurant → Restaurant                                   │
│    │ name (e.g., "Lunch", "Dinner")                           │
│    │ weekday (0-6, Mon-Sun)                                   │
│    │ opens_at (Time)                                          │
│    │ closes_at (Time)                                         │
│ IDX│ (restaurant_id, weekday)                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        GalleryImage                              │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ image (upload_to: gallery/)                              │
│    │ alt_text (required)                                      │
│    │ sort_order (indexed)                                     │
│    │ is_published (default: True)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Testimonial                               │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ name                                                      │
│    │ rating (1-5)                                             │
│    │ text                                                      │
│    │ sort_order (indexed)                                     │
│    │ is_published (default: True)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         BlogPost                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ title                                                     │
│ UQ │ slug (unique)                                            │
│    │ body_json [JSON]                                         │
│    │ body_html (pre-rendered)                                 │
│    │ cover_image (upload_to: blog/)                           │
│    │ published_at (nullable, indexed)                         │
│    │ seo [JSON]                                               │
│    │ is_published (default: True)                             │
│ IDX│ slug, published_at, is_published                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Reservation                               │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│    │ status (pending/confirmed/cancelled, indexed)            │
│    │ party_size                                               │
│    │ starts_at (indexed)                                      │
│    │ guest_name                                               │
│    │ guest_email (indexed)                                    │
│    │ guest_phone (optional)                                   │
│    │ notes (optional)                                         │
│    │ created_at (indexed)                                     │
│    │ updated_at                                               │
│ IDX│ (status, starts_at), (starts_at, status)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:1
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ReservationToken                            │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id                                                        │
│ FK │ reservation → Reservation (OneToOne)                     │
│ UQ │ token (unique, indexed, 64 chars)                        │
│    │ expires_at                                               │
│    │ created_at                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table Specifications

### Core Restaurant Models

#### Restaurant Table

**Purpose**: Singleton model storing restaurant identity and configuration

**Table Name**: `restaurant_restaurant`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `name` | VARCHAR(200) | NOT NULL | Restaurant name |
| `tagline` | VARCHAR(300) | NOT NULL | Marketing tagline |
| `description` | TEXT | NOT NULL | Full description |
| `phone` | VARCHAR(50) | NOT NULL | Contact phone |
| `email` | VARCHAR(254) | NOT NULL | Contact email |
| `location` | JSONB | NOT NULL | Address structure |
| `social` | JSONB | NOT NULL | Social media URLs |
| `branding` | JSONB | NOT NULL | Visual branding config |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**JSON Schemas**:

`location` JSON Structure:
```json
{
  "address": "123 Main Street",
  "city": "New York",
  "region": "NY",
  "postalCode": "10001",
  "country": "US",
  "geo": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "googleMapsEmbedUrl": "https://www.google.com/maps/embed?..."
}
```

`social` JSON Structure:
```json
{
  "instagram": "https://instagram.com/restaurant",
  "facebook": "https://facebook.com/restaurant",
  "tiktok": "https://tiktok.com/@restaurant",
  "x": "https://x.com/restaurant",
  "youtube": "https://youtube.com/restaurant",
  "website": "https://www.restaurant.com"
}
```

`branding` JSON Structure:
```json
{
  "logoFile": "logo.png",
  "primaryColorHex": "#1a1a1a",
  "secondaryColorHex": "#c9a961"
}
```

**Constraints**:
- Singleton pattern: Only one record allowed
- Django constraint: `models.CheckConstraint(check=models.Q(id=1), name='singleton')`

---

#### RestaurantSettings Table

**Purpose**: Extended configuration for restaurant operations

**Table Name**: `restaurant_restaurantsettings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `restaurant_id` | BIGINT | FK, UQ | One-to-one with Restaurant |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT | IANA timezone identifier |
| `staff_inbox_email` | VARCHAR(254) | NOT NULL | Staff notification email |
| `ga4_measurement_id` | VARCHAR(50) | NULL | Google Analytics 4 ID |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Default Values**:
- `timezone`: `'America/New_York'`

**Foreign Key**:
```sql
CONSTRAINT restaurant_restaurantsettings_restaurant_id_fk 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurant_restaurant(id) 
    ON DELETE CASCADE
```

---

#### ServicePeriod Table

**Purpose**: Opening hours and service time definitions

**Table Name**: `restaurant_serviceperiod`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `restaurant_id` | BIGINT | FK | Parent restaurant |
| `name` | VARCHAR(100) | NOT NULL | Period name (e.g., "Lunch") |
| `weekday` | INTEGER | NOT NULL, CHECK | Day of week (0=Mon, 6=Sun) |
| `opens_at` | TIME | NOT NULL | Opening time |
| `closes_at` | TIME | NOT NULL | Closing time |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Constraints**:
```sql
-- Weekday range check
CONSTRAINT service_period_weekday_chk 
    CHECK (weekday >= 0 AND weekday <= 6)

-- Time validation (opens before closes)
CONSTRAINT service_period_time_chk 
    CHECK (opens_at < closes_at)
```

**Indexes**:
```sql
CREATE INDEX restaurant_serviceperiod_restaurant_weekday_idx 
    ON restaurant_serviceperiod(restaurant_id, weekday);
```

---

#### GalleryImage Table

**Purpose**: Image gallery for restaurant showcase

**Table Name**: `restaurant_galleryimage`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `image` | VARCHAR(100) | NOT NULL | File path (gallery/) |
| `alt_text` | VARCHAR(300) | NOT NULL | Accessibility description |
| `sort_order` | INTEGER | NOT NULL | Display order |
| `is_published` | BOOLEAN | NOT NULL, DEFAULT | Visibility flag |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Default Values**:
- `is_published`: `TRUE`

**Indexes**:
```sql
CREATE INDEX restaurant_galleryimage_sort_order_idx 
    ON restaurant_galleryimage(sort_order);

CREATE INDEX restaurant_galleryimage_published_sort_idx 
    ON restaurant_galleryimage(is_published, sort_order) 
    WHERE is_published = TRUE;
```

---

#### Testimonial Table

**Purpose**: Customer testimonials and reviews

**Table Name**: `restaurant_testimonial`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `name` | VARCHAR(200) | NOT NULL | Customer name |
| `rating` | SMALLINT | NOT NULL, CHECK | Rating 1-5 stars |
| `text` | TEXT | NOT NULL | Testimonial content |
| `sort_order` | INTEGER | NOT NULL | Display order |
| `is_published` | BOOLEAN | NOT NULL, DEFAULT | Visibility flag |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Constraints**:
```sql
CONSTRAINT testimonial_rating_chk 
    CHECK (rating >= 1 AND rating <= 5)
```

**Default Values**:
- `is_published`: `TRUE`

**Indexes**:
```sql
CREATE INDEX restaurant_testimonial_sort_order_idx 
    ON restaurant_testimonial(sort_order);

CREATE INDEX restaurant_testimonial_published_rating_idx 
    ON restaurant_testimonial(is_published, rating DESC) 
    WHERE is_published = TRUE;
```

---

#### BlogPost Table

**Purpose**: Content management for blog articles

**Table Name**: `restaurant_blogpost`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `title` | VARCHAR(300) | NOT NULL | Article title |
| `slug` | VARCHAR(300) | UQ | URL-friendly identifier |
| `body_json` | JSONB | NOT NULL | TipTap editor JSON |
| `body_html` | TEXT | NOT NULL | Pre-rendered HTML |
| `cover_image` | VARCHAR(100) | NULL | Featured image path |
| `published_at` | TIMESTAMPTZ | NULL | Publication date |
| `seo` | JSONB | NOT NULL | SEO metadata |
| `is_published` | BOOLEAN | NOT NULL, DEFAULT | Visibility flag |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Default Values**:
- `is_published`: `TRUE`
- `seo`: `'{}'`

**JSON Schema** (`seo`):
```json
{
  "metaTitle": "SEO-optimized title (optional)",
  "metaDescription": "Meta description for search engines (optional)"
}
```

**Indexes**:
```sql
-- Unique slug lookup
CREATE UNIQUE INDEX restaurant_blogpost_slug_idx 
    ON restaurant_blogpost(slug);

-- Published posts by date
CREATE INDEX restaurant_blogpost_published_at_idx 
    ON restaurant_blogpost(published_at DESC) 
    WHERE published_at IS NOT NULL;

-- Visibility filter
CREATE INDEX restaurant_blogpost_published_idx 
    ON restaurant_blogpost(is_published, published_at DESC) 
    WHERE is_published = TRUE AND published_at IS NOT NULL;
```

---

### Reservation Models

#### ReservationSettings Table

**Purpose**: Reservation system configuration (Singleton)

**Table Name**: `reservations_reservationsettings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `slot_interval_minutes` | INTEGER | NOT NULL, DEFAULT | Time slot size (30) |
| `turn_time_minutes` | INTEGER | NOT NULL, DEFAULT | Table turnover time (90) |
| `max_guests_per_slot` | INTEGER | NOT NULL, DEFAULT | Max capacity per slot (40) |
| `max_party_size_online` | INTEGER | NOT NULL, DEFAULT | Online booking limit (8) |
| `min_lead_time_minutes` | INTEGER | NOT NULL, DEFAULT | Minimum notice (120) |
| `max_days_ahead` | INTEGER | NOT NULL, DEFAULT | Booking window (30) |
| `require_phone` | BOOLEAN | NOT NULL, DEFAULT | Phone required (True) |
| `approval_party_size_threshold` | INTEGER | NOT NULL, DEFAULT | Auto-approval limit (6) |
| `same_day_window_hours` | INTEGER | NOT NULL, DEFAULT | Same-day cutoff (4) |
| `near_capacity_percent` | INTEGER | NOT NULL, DEFAULT | Capacity warning (85) |
| `approval_windows` | JSONB | NOT NULL | Holiday/peak windows |
| `token_expiry_days` | INTEGER | NOT NULL, DEFAULT | Token lifespan (30) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Default Values**:
- All settings have sensible defaults as shown in Description column

**JSON Schema** (`approval_windows`):
```json
[
  {
    "startDate": "2024-12-24",
    "endDate": "2024-12-26",
    "requireApproval": true,
    "reason": "Holiday season"
  }
]
```

**Constraints**:
- Singleton pattern: Only one record allowed

---

#### Reservation Table

**Purpose**: Restaurant reservation records

**Table Name**: `reservations_reservation`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `status` | VARCHAR(20) | NOT NULL, CHECK | pending/confirmed/cancelled |
| `party_size` | INTEGER | NOT NULL | Number of guests |
| `starts_at` | TIMESTAMPTZ | NOT NULL | Reservation start time |
| `guest_name` | VARCHAR(200) | NOT NULL | Guest full name |
| `guest_email` | VARCHAR(254) | NOT NULL | Contact email |
| `guest_phone` | VARCHAR(50) | NULL | Contact phone |
| `notes` | TEXT | NULL | Special requests |
| `created_at` | TIMESTAMPTZ | NOT NULL | Booking timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Status Choices**:
- `pending`: Awaiting confirmation
- `confirmed`: Approved and scheduled
- `cancelled`: Cancelled by guest or staff

**Constraints**:
```sql
CONSTRAINT reservation_status_chk 
    CHECK (status IN ('pending', 'confirmed', 'cancelled'))
```

**Indexes**:
```sql
-- Status + time for listing reservations
CREATE INDEX reservations_reservation_status_starts_idx 
    ON reservations_reservation(status, starts_at);

-- Time + status for availability queries
CREATE INDEX reservations_reservation_starts_status_idx 
    ON reservations_reservation(starts_at, status);

-- Guest email lookup
CREATE INDEX reservations_reservation_guest_email_idx 
    ON reservations_reservation(guest_email);

-- Creation time for recent bookings
CREATE INDEX reservations_reservation_created_at_idx 
    ON reservations_reservation(created_at DESC);

-- Active reservations time range
CREATE INDEX reservations_reservation_active_time_idx 
    ON reservations_reservation(starts_at) 
    WHERE status IN ('pending', 'confirmed');
```

**Calculated Property** (`ends_at`):
```python
@property
def ends_at(self):
    settings = ReservationSettings.get_singleton()
    return self.starts_at + timedelta(minutes=settings.turn_time_minutes)
```

---

#### ReservationToken Table

**Purpose**: Secure tokens for reservation management URLs

**Table Name**: `reservations_reservationtoken`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGINT | PK | Auto-increment primary key |
| `reservation_id` | BIGINT | FK, UQ | One-to-one with Reservation |
| `token` | VARCHAR(64) | UQ, NOT NULL | Secure random token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Token expiration |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |

**Foreign Key**:
```sql
CONSTRAINT reservations_reservationtoken_reservation_fk 
    FOREIGN KEY (reservation_id) 
    REFERENCES reservations_reservation(id) 
    ON DELETE CASCADE
```

**Indexes**:
```sql
-- Token lookup for URL validation
CREATE UNIQUE INDEX reservations_reservationtoken_token_idx 
    ON reservations_reservationtoken(token);

-- Expiration cleanup
CREATE INDEX reservations_reservationtoken_expires_idx 
    ON reservations_reservationtoken(expires_at) 
    WHERE expires_at < NOW();
```

**Token Generation**:
```python
def generate_token():
    return secrets.token_urlsafe(48)[:64]  # URL-safe, 64 chars max
```

**Validity Check**:
```python
@property
def is_valid(self):
    return (
        self.expires_at > timezone.now() and 
        self.reservation.status != 'cancelled'
    )
```

---

## Design Patterns

### Singleton Pattern

Used for: `Restaurant`, `ReservationSettings`

**Implementation**:
```python
class SingletonModel(models.Model):
    """Base class for singleton models"""
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        pass  # Prevent deletion
    
    @classmethod
    def get_singleton(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
```

**Rationale**:
- Ensures single source of truth for global configuration
- Provides default values without NULL complexity
- Simplifies cache invalidation

---

### JSON Field Flexibility

**Use Cases**:
- `Restaurant.location`: Variable address formats
- `Restaurant.social`: Optional social platforms
- `Restaurant.branding`: Theme configuration
- `BlogPost.seo`: Extensible metadata
- `ReservationSettings.approval_windows`: Complex scheduling rules

**Benefits**:
- Schema evolution without migrations
- Frontend-driven content structure
- Reduced table complexity

**Trade-offs**:
- No foreign key constraints on JSON data
- Querying requires PostgreSQL JSON operators
- Limited indexing capabilities

**Query Example**:
```python
# Find restaurants with NYC location
Restaurant.objects.filter(location__city='New York')

# Find posts with custom SEO title
BlogPost.objects.filter(seo__metaTitle__isnull=False)
```

---

### Automatic Slug Generation

**Implementation** (BlogPost):
```python
class BlogPost(BaseModel):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            self.slug = self._generate_unique_slug(base_slug)
        super().save(*args, **kwargs)
    
    def _generate_unique_slug(self, base_slug):
        slug = base_slug
        counter = 1
        while BlogPost.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug
```

**Behavior**:
- First save: generates slug from title
- Subsequent saves: preserves existing slug
- Handles duplicates with incrementing suffix

---

### Secure Token Generation

**Implementation** (ReservationToken):
```python
import secrets
from django.utils import timezone
from datetime import timedelta

class ReservationToken(models.Model):
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)[:64]
            settings = ReservationSettings.get_singleton()
            self.expires_at = timezone.now() + timedelta(
                days=settings.token_expiry_days
            )
        super().save(*args, **kwargs)
```

**Security Features**:
- Cryptographically secure random generation
- URL-safe base64 encoding
- Configurable expiration
- Automatic cleanup via expires_at index

---

## Indexes and Performance

### Index Strategy

**1. Lookup Optimization**
```sql
-- Primary keys (automatic)
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (slug)
UNIQUE (token)
UNIQUE (restaurant_id)  -- For one-to-one
```

**2. Query Pattern Support**
```sql
-- Composite indexes for common filters
(status, starts_at)  -- List reservations by status and time
(restaurant_id, weekday)  -- Service period lookups
(is_published, sort_order)  -- Display ordering with filter
```

**3. Partial Indexes**
```sql
-- Only index published content
WHERE is_published = TRUE

-- Only index published posts with dates
WHERE is_published = TRUE AND published_at IS NOT NULL

-- Only index active reservations
WHERE status IN ('pending', 'confirmed')
```

**4. Foreign Key Indexes** (Automatic by Django)
```sql
-- All FK columns get indexes by default
reservation_id  -- In reservationtoken table
restaurant_id   -- In serviceperiod table
```

### Query Performance Guidelines

**Efficient Queries**:
```python
# Use select_related for one-to-one relations
Reservation.objects.select_related('reservationtoken')

# Use prefetch_related for reverse relations
Restaurant.objects.prefetch_related('serviceperiod_set')

# Filter on indexed columns first
Reservation.objects.filter(
    status='confirmed',
    starts_at__gte=today
).order_by('starts_at')
```

**Avoid**:
```python
# Full table scans on large tables
Reservation.objects.filter(notes__icontains='birthday')

# Ordering by non-indexed columns
BlogPost.objects.order_by('body_html')

# JSON field filtering without GIN index
Restaurant.objects.filter(location__address__icontains='Main')
```

### GIN Index for JSON Fields (Optional)

If querying JSON fields frequently:
```sql
-- For Restaurant.location queries
CREATE INDEX restaurant_location_gin_idx 
    ON restaurant_restaurant USING GIN (location);

-- For BlogPost.seo queries  
CREATE INDEX blogpost_seo_gin_idx 
    ON restaurant_blogpost USING GIN (seo);
```

---

## Data Flow Examples

### Reservation Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CREATE    │────▶│   PENDING   │────▶│  CONFIRMED  │────▶│   COMPLETE  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  CANCELLED  │◀────│  CANCELLED  │
                    │  (Timeout)  │     │  (Guest)    │
                    └─────────────┘     └─────────────┘
```

**1. Creation Flow**:
```python
# Guest submits reservation request
reservation = Reservation.objects.create(
    status='pending',
    party_size=4,
    starts_at=datetime(2024, 12, 25, 19, 0),
    guest_name='John Doe',
    guest_email='john@example.com',
    guest_phone='+1-555-0123'
)

# Token auto-generated
# Guest receives email with management URL containing token
```

**2. Auto-approval Logic**:
```python
settings = ReservationSettings.get_singleton()

if reservation.party_size <= settings.approval_party_size_threshold:
    # Auto-confirm small parties
    reservation.status = 'confirmed'
else:
    # Large parties require manual approval
    reservation.status = 'pending'
    notify_staff(reservation)

reservation.save()
```

**3. Cancellation Flow**:
```python
# Guest clicks cancel link with token
token = ReservationToken.objects.get(token=request_token)

if token.is_valid:
    token.reservation.status = 'cancelled'
    token.reservation.save()
    notify_staff_of_cancellation(token.reservation)
    
# Token remains but becomes invalid after cancellation
```

**4. Capacity Check**:
```python
def check_capacity(start_time, party_size):
    settings = ReservationSettings.get_singleton()
    
    # Get all active reservations for this time slot
    active_reservations = Reservation.objects.filter(
        status__in=['pending', 'confirmed'],
        starts_at=start_time
    )
    
    total_guests = sum(r.party_size for r in active_reservations)
    
    if total_guests + party_size > settings.max_guests_per_slot:
        return False, "Slot is full"
    
    # Check near capacity
    capacity_percent = (total_guests / settings.max_guests_per_slot) * 100
    if capacity_percent > settings.near_capacity_percent:
        return True, "Near capacity warning"
    
    return True, "Available"
```

---

## Migration Guidelines

### Development Workflow

**1. Model Changes**:
```bash
# After modifying models
python manage.py makemigrations restaurant reservations

# Review generated migration
python manage.py sqlmigrate restaurant 0001

# Apply migration
python manage.py migrate
```

**2. Safe Migration Practices**:

**Adding Columns**:
```python
# Safe: Add with default or nullable
field = models.CharField(max_length=100, default='')
field = models.CharField(max_length=100, null=True)
```

**Removing Columns**:
```python
# Step 1: Make nullable (deploy)
field = models.CharField(max_length=100, null=True, blank=True)

# Step 2: Remove from code (deploy)

# Step 3: Remove from model, create migration (deploy)
```

**Renaming Columns**:
```python
# Use RenameField - handles it in single migration
# Or: Add new, copy data, remove old (for large tables)
```

**3. Data Migrations**:
```python
from django.db import migrations

def populate_slug(apps, schema_editor):
    BlogPost = apps.get_model('restaurant', 'BlogPost')
    for post in BlogPost.objects.all():
        post.slug = slugify(post.title)
        post.save()

class Migration(migrations.Migration):
    dependencies = [('restaurant', '0001_initial')]
    operations = [
        migrations.RunPython(populate_slug),
    ]
```

### Migration Checklist

- [ ] Generated migration reviewed with `sqlmigrate`
- [ ] Backwards compatibility maintained (blue/green deploys)
- [ ] Data migrations tested with copy of production data
- [ ] Index creation uses `CONCURRENTLY` for large tables
- [ ] Rollback plan documented for risky changes

---

## Backup and Restore

### Automated Backups

Reference: `scripts/backup.sh`

```bash
#!/bin/bash
# scripts/backup.sh

DB_NAME="restaurant_db"
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="${DB_NAME}_${DATE}.sql.gz"

# Create backup
pg_dump -h localhost -U postgres $DB_NAME | gzip > "${BACKUP_DIR}/${FILENAME}"

# Retain last 30 days
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete
```

**Cron Setup**:
```cron
# Daily backup at 2 AM
0 2 * * * /home/user/restaurant/scripts/backup.sh >> /var/log/db_backup.log 2>&1
```

### Manual Backup

```bash
# Full database backup
pg_dump -h localhost -U postgres restaurant_db > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U postgres restaurant_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Specific tables only
pg_dump -h localhost -U postgres restaurant_db \
    --table=restaurant_restaurant \
    --table=reservations_reservation > tables_backup.sql
```

### Restore Procedures

**Full Restore**:
```bash
# Drop and recreate database
dropdb -h localhost -U postgres restaurant_db
createdb -h localhost -U postgres restaurant_db

# Restore from backup
gunzip -c backup_20240115.sql.gz | psql -h localhost -U postgres restaurant_db

# Or uncompressed
psql -h localhost -U postgres restaurant_db < backup_20240115.sql
```

**Selective Restore**:
```bash
# Restore single table from backup
pg_restore --table=restaurant_blogpost backup.dump
```

### Point-in-Time Recovery (If WAL archiving enabled)

```bash
# Requires PostgreSQL configured with archive_mode = on
# Restore base backup, then replay WAL to specific timestamp
pg_basebackup -D /restore_dir
# Configure recovery.conf with target time
```

---

## Common Query Patterns

### Restaurant Operations

**Get Restaurant with Settings**:
```python
from django.db.models import Prefetch

restaurant = Restaurant.objects.prefetch_related(
    'restaurantsettings'
).first()

settings = restaurant.restaurantsettings
```

**Get Current Service Periods**:
```python
from django.utils import timezone

today_weekday = timezone.now().weekday()
service_periods = ServicePeriod.objects.filter(
    restaurant=restaurant,
    weekday=today_weekday
).order_by('opens_at')
```

### Content Management

**Published Blog Posts**:
```python
posts = BlogPost.objects.filter(
    is_published=True,
    published_at__lte=timezone.now()
).order_by('-published_at')
```

**Gallery Images by Order**:
```python
images = GalleryImage.objects.filter(
    is_published=True
).order_by('sort_order')
```

**Published Testimonials (High Rating First)**:
```python
testimonials = Testimonial.objects.filter(
    is_published=True
).order_by('-rating', 'sort_order')
```

### Reservation Management

**Today's Reservations**:
```python
from django.utils import timezone
from datetime import timedelta

today_start = timezone.now().replace(hour=0, minute=0, second=0)
today_end = today_start + timedelta(days=1)

today_reservations = Reservation.objects.filter(
    status__in=['pending', 'confirmed'],
    starts_at__gte=today_start,
    starts_at__lt=today_end
).order_by('starts_at')
```

**Guest Reservation History**:
```python
history = Reservation.objects.filter(
    guest_email='john@example.com'
).order_by('-created_at')
```

**Upcoming Confirmed Reservations**:
```python
upcoming = Reservation.objects.filter(
    status='confirmed',
    starts_at__gte=timezone.now()
).order_by('starts_at')
```

**Capacity by Time Slot**:
```python
from django.db.models import Sum

slot = datetime(2024, 12, 25, 19, 0)
capacity_used = Reservation.objects.filter(
    status__in=['pending', 'confirmed'],
    starts_at=slot
).aggregate(total_guests=Sum('party_size'))
```

**Reservations Requiring Approval**:
```python
settings = ReservationSettings.get_singleton()

pending_approval = Reservation.objects.filter(
    status='pending',
    party_size__gt=settings.approval_party_size_threshold
).order_by('created_at')
```

### Token Validation

**Validate Management URL**:
```python
try:
    token = ReservationToken.objects.select_related(
        'reservation'
    ).get(token=url_token)
    
    if not token.is_valid:
        raise InvalidTokenError("Token expired or reservation cancelled")
    
    reservation = token.reservation
    # Proceed with management operations
    
except ReservationToken.DoesNotExist:
    raise InvalidTokenError("Invalid token")
```

---

## Data Integrity

### Database-Level Constraints

**Foreign Key Integrity**:
```sql
-- All foreign keys use ON DELETE CASCADE
-- Deleting a restaurant deletes its service periods
-- Deleting a reservation deletes its token
```

**Check Constraints**:
```sql
-- Weekday range
CHECK (weekday >= 0 AND weekday <= 6)

-- Time ordering
CHECK (opens_at < closes_at)

-- Rating bounds
CHECK (rating >= 1 AND rating <= 5)

-- Status validation
CHECK (status IN ('pending', 'confirmed', 'cancelled'))
```

### Application-Level Validation

**Django Model Validation**:
```python
class ServicePeriod(models.Model):
    opens_at = models.TimeField()
    closes_at = models.TimeField()
    
    def clean(self):
        if self.opens_at >= self.closes_at:
            raise ValidationError(
                "Opening time must be before closing time"
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

**Reservation Business Rules**:
```python
def validate_reservation(reservation):
    settings = ReservationSettings.get_singleton()
    
    # Minimum lead time
    min_time = timezone.now() + timedelta(
        minutes=settings.min_lead_time_minutes
    )
    if reservation.starts_at < min_time:
        raise ValidationError(
            f"Reservations must be made at least "
            f"{settings.min_lead_time_minutes} minutes in advance"
        )
    
    # Maximum booking window
    max_date = timezone.now() + timedelta(days=settings.max_days_ahead)
    if reservation.starts_at > max_date:
        raise ValidationError(
            f"Reservations can only be made up to "
            f"{settings.max_days_ahead} days in advance"
        )
    
    # Online party size limit
    if reservation.party_size > settings.max_party_size_online:
        raise ValidationError(
            f"Online bookings limited to "
            f"{settings.max_party_size_online} guests"
        )
```

### Data Consistency Patterns

**Transaction Safety**:
```python
from django.db import transaction

@transaction.atomic
def confirm_reservation(reservation_id):
    reservation = Reservation.objects.select_for_update().get(
        id=reservation_id
    )
    
    if reservation.status != 'pending':
        raise ValueError("Reservation already processed")
    
    # Verify capacity still available
    available, message = check_capacity(
        reservation.starts_at,
        reservation.party_size
    )
    
    if not available:
        raise CapacityError(message)
    
    reservation.status = 'confirmed'
    reservation.save()
    
    send_confirmation_email(reservation)
```

**Cleanup Jobs**:
```python
# Remove expired tokens (run via cron)
def cleanup_expired_tokens():
    expired = ReservationToken.objects.filter(
        expires_at__lt=timezone.now()
    )
    expired.delete()

# Mark stale pending reservations (run hourly)
def expire_stale_pending():
    stale_time = timezone.now() - timedelta(hours=24)
    
    Reservation.objects.filter(
        status='pending',
        created_at__lt=stale_time
    ).update(status='cancelled')
```

---

## Appendix

### PostgreSQL Configuration

**Recommended Settings** (postgresql.conf):
```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connections
max_connections = 100

# WAL
wal_buffers = 16MB
min_wal_size = 80MB
max_wal_size = 1GB

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Connection String

```
postgresql://user:password@localhost:5432/restaurant_db
```

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_db
DATABASE_CONN_MAX_AGE=600
DATABASE_OPTIONS=-c statement_timeout=30000
```

---

*Last Updated: 2024-01-31*
*Database Version: PostgreSQL 16*
*Django Version: 5.x*