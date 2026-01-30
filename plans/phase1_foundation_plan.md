# Phase 1: Foundation - Implementation Plan

## Overview
This plan covers the foundational backend infrastructure needed before building feature APIs. Based on [`docs/WBS_BACKEND.md`](docs/WBS_BACKEND.md) sections 1.2, 1.3, 3.1, 3.2, and 9.1-9.3.

## Prerequisites
- All models are already implemented and migrated
- Django settings configured with DRF, JWT, CORS
- Demo seed data available via [`python manage.py seed_demo`](backend/core/management/commands/seed_demo.py)

---

## Task 1: URL Routing Structure

**Goal**: Set up the URL routing hierarchy for the API.

**Files to Modify**:
- [`backend/config/urls.py`](backend/config/urls.py:1)

**Actions**:
1. Create URL includes for each app:
   - `api/public/` → `restaurant.urls_public`, `menu.urls_public`, `reservations.urls_public`
   - `api/admin/` → `accounts.urls_admin`, `restaurant.urls_admin`, `menu.urls_admin`, `reservations.urls_admin`
2. Add media file serving for development
3. Add health check endpoint at `/health/`

**Acceptance Criteria**:
- Visiting `/api/` returns 404 with API structure info (optional)
- Visiting `/health/` returns 200 OK
- URL structure matches [`docs/API/CONTRACT.md`](docs/API/CONTRACT.md:3) conventions

---

## Task 2: Custom Permission Classes

**Goal**: Implement role-based permission classes for admin endpoints.

**Files to Create**:
- `backend/core/permissions.py`

**Actions**:
1. Create `IsAdmin` permission (role = admin)
2. Create `IsManager` permission (role in [admin, manager])
3. Create `CanManageReservations` permission (role in [admin, manager, host])
4. Create `CanManageContent` permission (role in [admin, manager, editor])
5. Create `ReadOnly` permission for safe methods

**Reference**: [`docs/ADMIN/PERMISSIONS.md`](docs/ADMIN/PERMISSIONS.md:15)

**Acceptance Criteria**:
- Each permission correctly allows/denies based on user role
- Permissions work with DRF's `@permission_classes` decorator

---

## Task 3: Authentication Endpoints

**Goal**: Implement JWT-based authentication endpoints for admin users.

**Files to Create**:
- `backend/accounts/urls_admin.py`
- `backend/accounts/serializers.py`
- `backend/accounts/views.py` (replace current empty file)

**Actions**:
1. **Serializer**: Create `UserSerializer` for user profile response
2. **Login View**:
   - POST `/api/admin/auth/login`
   - Accept email, password
   - Return access token in response body, refresh token in httpOnly cookie
   - Log `admin.login` or `admin.login_failed` audit event
   - Rate limit: 5/min, 20/hour per IP
3. **Refresh View**:
   - POST `/api/admin/auth/refresh`
   - Read refresh token from cookie
   - Return new access token
4. **Logout View**:
   - POST `/api/admin/auth/logout`
   - Invalidate refresh token (clear cookie)
   - Log `admin.logout` audit event
5. **Me View**:
   - GET `/api/admin/auth/me`
   - Return current user profile (id, email, role, permissions)

**Reference**: [`docs/API/CONTRACT.md`](docs/API/CONTRACT.md:191) lines 191-213, [`docs/SECURITY.md`](docs/SECURITY.md:7)

**Acceptance Criteria**:
- Login returns valid JWT tokens
- Refresh endpoint works with cookie
- Logout clears refresh token
- `/me` returns user profile with role
- Rate limiting enforced on login
- Audit events logged for login/logout/failed attempts

---

## Task 4: Error Response Standardization

**Goal**: Ensure all API errors follow the standard schema from [`docs/API/CONTRACT.md`](docs/API/CONTRACT.md:14).

**Files to Create**:
- `backend/core/exceptions.py`
- `backend/core/renderers.py` (optional, for consistent response wrapping)

**Actions**:
1. Create custom exception handler that formats errors as:
   ```json
   {
     "error": "ERROR_CODE",
     "message": "Human readable message",
     "details": { ... }
   }
   ```
2. Map Django/DRF exceptions to standard error codes:
   - ValidationError → VALIDATION_ERROR (400)
   - AuthenticationFailed → UNAUTHORIZED (401)
   - PermissionDenied → FORBIDDEN (403)
   - NotFound → NOT_FOUND (404)
   - Throttled → RATE_LIMITED (429)
3. Update DRF settings to use custom exception handler

**Reference**: [`docs/API/CONTRACT.md`](docs/API/CONTRACT.md:25) lines 25-34

**Acceptance Criteria**:
- All API errors return consistent schema
- Error codes match the contract specification
- Validation errors include field-level details

---

## Task 5: Health Check Endpoint

**Goal**: Implement basic health check for monitoring.

**Files to Modify**:
- `backend/core/views.py`
- `backend/config/urls.py`

**Actions**:
1. Create health check view at `/health/`
2. Check database connectivity
3. Return JSON: `{"status": "ok", "version": "0.1.0", "checks": {...}}`

**Acceptance Criteria**:
- Returns 200 when database is accessible
- Returns 503 when database is down
- Includes basic service info

---

## Task 6: Request Logging Middleware

**Goal**: Add structured request logging for observability.

**Files to Create**:
- `backend/core/middleware.py`

**Actions**:
1. Create middleware that logs each request:
   - Timestamp
   - Method, path, status code
   - Duration
   - User ID (if authenticated)
   - IP address
2. Add to [`settings.MIDDLEWARE`](backend/config/settings.py:57)

**Reference**: [`docs/WBS_BACKEND.md`](docs/WBS_BACKEND.md:139) section 9.1

**Acceptance Criteria**:
- All requests are logged with structured format
- Logs include timing information
- User attribution when authenticated

---

## Task 7: Tests for Foundation

**Goal**: Write tests for authentication and permissions.

**Files to Create/Modify**:
- `backend/accounts/tests.py` (replace)
- `backend/core/tests.py` (add permission tests)

**Actions**:
1. Test login success/failure
2. Test token refresh
3. Test logout
4. Test permission classes with each role
5. Test rate limiting on login

**Acceptance Criteria**:
- All auth endpoints have test coverage
- Permission tests verify role matrix
- Rate limiting behavior tested

---

## Implementation Order

1. **Task 1** - URL Routing (enables testing other endpoints)
2. **Task 4** - Error Standardization (affects all responses)
3. **Task 2** - Permission Classes (needed by auth views)
4. **Task 3** - Authentication Endpoints (core feature)
5. **Task 5** - Health Check (simple, useful for ops)
6. **Task 6** - Request Logging (observability)
7. **Task 7** - Tests (validate everything)

---

## Dependencies

- No external dependencies beyond what's in [`pyproject.toml`](backend/pyproject.toml:6)
- Uses existing: djangorestframework-simplejwt, django-ratelimit

---

## Success Criteria for Phase 1

- [ ] API responds at `/api/` with proper routing
- [ ] Health check at `/health/` returns status
- [ ] Admin can login and receive JWT tokens
- [ ] Token refresh works via cookie
- [ ] Logout invalidates session
- [ ] User profile endpoint returns role info
- [ ] Rate limiting prevents brute force on login
- [ ] All errors follow standard schema
- [ ] Audit events logged for auth actions
- [ ] Tests pass for all auth flows

---

## Next Phase Preview

**Phase 2: Public APIs** will implement:
- Public read endpoints (restaurant, menu, gallery, testimonials, blog)
- Reservation availability endpoint
- Reservation creation with token generation
