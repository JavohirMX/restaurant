# API Contract Outline (MVP)

Base prefix: `/api`

Auth model per `PLAN.md`: JWT access/refresh for staff/admin endpoints.

## Conventions

### Timestamps
- ISO 8601 format, timezone-aware (UTC in API responses)
- Convert to restaurant timezone in UI for display

### Error Schema
All error responses use this consistent shape:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Human readable message",
  "details": {
    "field_name": ["error message"]
  }
}
```

**Standard Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., capacity exceeded) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Pagination
All list endpoints return paginated responses:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
- Default `pageSize`: 20
- Maximum `pageSize`: 100
- Query params: `page` (1-indexed), `pageSize`

### Filtering
- Query params use explicit naming: `status=pending`, `from=2024-01-01`, `to=2024-01-31`
- Multiple values use comma separation: `status=pending,confirmed`

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
- bodyHtml (pre-rendered HTML for public display)
- coverImageUrl
- publishedAt
- seo: { metaTitle, metaDescription } (optional)

**404** if not found/unpublished

> **Note**: Blog body is stored as TipTap JSON internally. Public API returns pre-rendered `bodyHtml`. Admin API returns both `bodyJson` (for editing) and `bodyHtml` (for preview).

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
- `/api/admin/blog` (returns `bodyJson` for editing + `bodyHtml` for preview)
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
