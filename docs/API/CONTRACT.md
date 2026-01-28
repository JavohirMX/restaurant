# API Contract Outline (MVP)

Base prefix: `/api`

Auth model per `PLAN.md`: JWT access/refresh for staff/admin endpoints.

## Conventions

- **Timestamps**: ISO 8601, timezone-aware (UTC in API, convert to restaurant timezone in UI).
- **Errors**: consistent shape:
  - `{"error":"code","message":"Human readable","details":{...}}`
- **Pagination** (for lists): `page`, `pageSize`, `total` (exact style TBD).

## Public (read-only)

### `GET /api/public/restaurant`

**200**

- name, tagline, description
- contact: phone/publicEmail
- location: address + geo + googleMapsEmbedUrl
- socials
- hours summary (optional; can be separate)

### `GET /api/public/menu`

**200**

- categories[]:
  - id, name, sort
  - items[]:
    - id, name, description, tags[], sort
    - photos[] (urls)
    - variants[]: name, priceCents, sort

### `GET /api/public/gallery`

**200**

- images[]: id, url, width, height, altText, sort

### `GET /api/public/testimonials`

**200**

- testimonials[]: id, name, rating (1-5), text, sort

### `GET /api/public/blog`

Query params: `page`, `pageSize` (optional), maybe `q` later.

**200**

- posts[]: title, slug, excerpt, coverImageUrl, publishedAt
- pagination info

### `GET /api/public/blog/:slug`

**200**

- title, slug
- body (TipTap JSON or HTML; pick one for implementation)
- cover image
- publishedAt
- SEO fields (optional)

**404** if not found/unpublished

### `GET /api/public/reservations/availability?date=YYYY-MM-DD`

Restaurant timezone date.

**200**

- date
- slotIntervalMinutes
- slots[]:
  - startsAt (ISO timestamp)
  - available (boolean)
  - remainingCapacity (optional)
  - requiresApproval (optional hint)

## Public reservations (token-based)

### `POST /api/public/reservations`

**Request**

- partySize (int)
- startsAt (ISO)
- guest:
  - name
  - email
  - phone (required depending on settings)
- notes (string, optional)
- optional anti-spam fields (honeypot)

**201**

- reservation:
  - id
  - status: pending|confirmed
  - partySize, startsAt
  - guest fields (maybe omit email in response if already known)
- token:
  - token (string)
  - manageUrl (string, optional convenience)

**400** validation errors (bad time, outside bounds)
**409** capacity conflict (can’t be accepted)
**429** rate limited

### `GET /api/public/reservations/:token`

**200**

- reservation details + status

**404** invalid/expired token

### `PATCH /api/public/reservations/:token`

**Request**

- partySize (optional)
- startsAt (optional)
- guest updates (optional)
- notes (optional)

**200**

- reservation (possibly status transitions to pending/confirmed)

**404** invalid/expired token
**409** conflict (e.g. new time cannot fit)

### `POST /api/public/reservations/:token/cancel`

**200**

- reservation status = cancelled

**404** invalid/expired token

## Admin auth (protected)

### `POST /api/admin/auth/login`

**Request**: email, password
**200**: accessToken, refreshToken, user (id, email, role)
**401** invalid
**429** rate limited

### `POST /api/admin/auth/refresh`

**Request**: refreshToken
**200**: new accessToken
**401** invalid/expired

### `POST /api/admin/auth/logout`

Invalidate refresh token (implementation detail).
**204**

### `GET /api/admin/auth/me`

**200**: user profile + role

## Admin content CRUD (protected)

CRUD endpoints (exact resource naming can be normalized during implementation):

- `/api/admin/menu/categories`
- `/api/admin/menu/items`
- `/api/admin/menu/variants`
- `/api/admin/gallery`
- `/api/admin/testimonials`
- `/api/admin/blog`
- `/api/admin/hours`
- `/api/admin/reservation-settings`

Each should support:
- **list** with sorting and filtering
- **create/update/delete**
- **reorder** (drag-and-drop sorting) via:
  - `PATCH /.../reorder` with array of ids in order (recommended)

## Admin reservations (protected)

### `GET /api/admin/reservations`

Filters (MVP):

- `status` (pending/confirmed/cancelled)
- date range: `from`, `to`
- `q` (guest name/email/phone)

**200** list + pagination

### `POST /api/admin/reservations/:id/approve`

**200** reservation with status confirmed

### `POST /api/admin/reservations/:id/cancel`

**Request**: optional reason
**200** reservation with status cancelled
