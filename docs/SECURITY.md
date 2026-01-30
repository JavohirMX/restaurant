# Security & Compliance Baseline (MVP)

This document defines authentication, authorization, rate limiting, audit logging, and data handling policies for the backend.

## Authentication

### JWT Token Strategy

| Token Type | Lifetime | Storage (Client) | Refresh Strategy |
|------------|----------|------------------|------------------|
| Access Token | 15 minutes | Memory only | Refresh before expiry |
| Refresh Token | 7 days | httpOnly cookie | Rotate on use |

### Token Flow

1. **Login**: Client sends credentials to `/api/admin/auth/login`
   - Server returns `accessToken` in response body
   - Server sets `refreshToken` in httpOnly cookie
2. **API Requests**: Client includes `Authorization: Bearer <accessToken>` header
3. **Refresh**: Client calls `/api/admin/auth/refresh` before access token expires
   - Server validates refresh token from cookie
   - Server returns new `accessToken`
   - Server may rotate refresh token (optional)
4. **Logout**: Client calls `/api/admin/auth/logout`
   - Server invalidates refresh token (deletion or blacklist)
   - Client clears access token from memory

### Token Security

- Access tokens are JWTs signed with a secret key (HS256) or RSA key pair (RS256)
- Refresh tokens are opaque strings stored server-side with user association
- Tokens include: `sub` (user ID), `role`, `iat`, `exp`
- Invalid/expired tokens return 401 Unauthorized

## Authorization

### Role-Based Access Control

Roles defined in `docs/ADMIN/PERMISSIONS.md`:
- `admin` - Full access
- `manager` - All content + reservations
- `host` - Reservations only
- `editor` - Content only (menu, gallery, testimonials, blog)

### Endpoint Protection

- All `/api/admin/*` endpoints require valid JWT
- Role checks enforced via middleware/decorators
- Public endpoints (`/api/public/*`) require no authentication

## Rate Limiting

### Limits by Endpoint (per IP address)

| Endpoint | Requests/Minute | Requests/Hour | Notes |
|----------|-----------------|---------------|-------|
| `POST /api/admin/auth/login` | 5 | 20 | Prevent brute force |
| `POST /api/public/reservations` | 10 | 50 | Prevent spam bookings |
| General API | 100 | - | Standard protection |

### Rate Limit Response

When rate limited, API returns:
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": 60
  }
}
```
HTTP Status: 429 Too Many Requests
Header: `Retry-After: 60`

## Abuse Protections

### Reservation Form

- **Honeypot field**: Include hidden `website` field in reservation form
  - If populated, silently reject the submission (return success to avoid tipping off bots)
- **Input sanitization**: Strip HTML tags from all text inputs
- **Field length limits**: Enforce reasonable maximums (name: 100, notes: 500, etc.)

### General

- Request body size limit: 1MB (10MB for image uploads)
- SQL injection prevention via parameterized queries (ORM)
- XSS prevention via output encoding

## Audit Logging

### Logged Events

| Event | Actor | Payload |
|-------|-------|---------|
| `admin.login` | User | `{ userId, email, ip }` |
| `admin.logout` | User | `{ userId }` |
| `admin.login_failed` | System | `{ email, ip, reason }` |
| `reservation.created` | Guest/System | `{ reservationId, status, guestEmail }` |
| `reservation.approved` | User | `{ reservationId, userId }` |
| `reservation.cancelled` | User/Guest | `{ reservationId, actor, reason? }` |
| `reservation.modified` | Guest | `{ reservationId, changes }` |
| `menu.item.created` | User | `{ itemId, userId }` |
| `menu.item.updated` | User | `{ itemId, userId, changes }` |
| `menu.item.deleted` | User | `{ itemId, userId }` |
| `blog.post.published` | User | `{ postId, userId }` |
| `blog.post.unpublished` | User | `{ postId, userId }` |

### Audit Event Schema

```json
{
  "id": "uuid",
  "event": "reservation.approved",
  "actor_type": "user",
  "actor_id": "uuid",
  "entity_type": "reservation",
  "entity_id": "uuid",
  "metadata": { ... },
  "ip_address": "192.168.1.1",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Retention

- Audit logs retained for **1 year**
- Automated cleanup via scheduled job (future implementation)

## Data Handling & Privacy

### PII Storage

| Field | Location | Encryption | Notes |
|-------|----------|------------|-------|
| Guest name | `reservations` table | No | Required for booking |
| Guest email | `reservations` table | No | Required for confirmation emails |
| Guest phone | `reservations` table | No | Optional based on settings |
| Admin password | `users` table | Hashed (bcrypt/argon2) | Never stored in plain text |

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Reservations | Indefinite | Manual on request |
| Audit logs | 1 year | Automated cleanup |
| Expired tokens | 30 days post-expiry | Automated cleanup |

### GDPR Considerations (Future)

- **Right to erasure**: Template should include admin endpoint to delete guest data
- **Data export**: Not required for MVP
- **Consent**: Reservation form should include privacy policy acknowledgment

### Encryption

- **At rest**: Rely on database-level encryption (Postgres TDE if enabled)
- **In transit**: All API traffic over HTTPS (enforced at deployment)
- **Passwords**: Hashed using bcrypt (cost factor 12) or argon2id

## Password Policy

### Requirements (Admin Users)

- Minimum length: 8 characters
- Must contain: letters and numbers (no special character requirement for MVP)
- No password history check for MVP

### Hashing

- Algorithm: bcrypt with cost factor 12 (or argon2id)
- Salt: Automatically generated per password

## Environment Variables (Security-Related)

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Django secret key for signing | Yes |
| `JWT_SECRET` | Secret for JWT signing (if HS256) | Yes |
| `DATABASE_URL` | Postgres connection string | Yes |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames | Yes (prod) |
| `CORS_ORIGINS` | Allowed CORS origins | Yes (prod) |
| `DEBUG` | Debug mode (must be false in prod) | Yes |
