# Backend WBS (Restaurant Template)

## Scope and assumptions
- Tech-agnostic backend template (framework- and DB-neutral).
- Full backend scope: API, data model, auth, reservations, content CRUD, email, jobs, ops/infra.
- References:
  - `docs/ACCEPTANCE_CRITERIA.md`
  - `docs/API/CONTRACT.md`
  - `docs/RESERVATIONS/POLICY.md`

## Acceptance Criteria → Backend Modules
| Acceptance Criteria area | Backend modules |
| --- | --- |
| Public site data (home, menu, gallery, testimonials, about, contact, hours) | Public read APIs, CMS data model, media metadata, hours settings |
| Reservations (guest) | Availability engine, reservation lifecycle, token-based manage endpoints |
| Reservations (admin) | Admin auth, reservation list/filters, approve/cancel actions, audit events |
| Admin content management | Admin CRUD for menu, gallery, testimonials, blog, hours, reservation settings |
| Email flows | Notification service, templates, SMTP/local dev delivery |
| SEO | API support for metadata, sitemap/robots feed data, blog publish rules |
| Accessibility | Alt-text validation in admin API (enforcement) |
| Analytics | Config endpoint or settings storage for GA4 ID |

## WBS (Level 1 → Level 3)

### 1. Product & Requirements Baseline
1.1 Confirm MVP scope and success criteria
- 1.1.1 Map acceptance criteria to backend capabilities
- 1.1.2 Identify required integrations (email, maps, analytics)
- 1.1.3 Define non-goals for template v1

1.2 Define API surface and standards
- 1.2.1 Finalize public/admin route taxonomy
- 1.2.2 Define error schema, pagination, filtering rules
- 1.2.3 Decide content formats (e.g., blog body format)

1.3 Security and compliance baseline
- 1.3.1 Auth token lifetimes and refresh flow
- 1.3.2 Rate limits, abuse protections, audit events
- 1.3.3 Data retention and PII handling notes

### 2. Data Model & Storage
2.1 Core entities and relations
- 2.1.1 Restaurant profile, location, hours
- 2.1.2 Menu categories, items, variants
- 2.1.3 Gallery images, testimonials, blog posts
- 2.1.4 Reservations, guests, tokens, settings
- 2.1.5 Admin users, roles, permissions
- 2.1.6 Audit events

2.2 Data integrity rules
- 2.2.1 Sorting and ordering fields
- 2.2.2 Status enums and transitions
- 2.2.3 Soft-delete strategy (if needed)

2.3 Migrations & seeds
- 2.3.1 Baseline schema migrations
- 2.3.2 Seed data for template demo

### 3. Auth & Access Control
3.1 Admin authentication
- 3.1.1 Login, refresh, logout endpoints
- 3.1.2 Password policies and hashing
- 3.1.3 Token revocation/rotation strategy

3.2 Authorization
- 3.2.1 Role model and permissions mapping
- 3.2.2 Middleware/guards for admin endpoints

3.3 Public token-based access
- 3.3.1 Reservation manage token issuance
- 3.3.2 Token expiry and invalidation rules

### 4. Public Read APIs
4.1 Restaurant profile endpoints
- 4.1.1 Public restaurant info
- 4.1.2 Hours/locations (if split)

4.2 Menu endpoints
- 4.2.1 Category and item rendering
- 4.2.2 Variant and pricing representation

4.3 Gallery/testimonials endpoints
- 4.3.1 Published-only queries
- 4.3.2 Sorting behavior

4.4 Blog endpoints
- 4.4.1 List and detail with publishing rules

### 5. Reservations Engine
5.1 Availability computation
- 5.1.1 Slot generation and service periods
- 5.1.2 Capacity accounting logic

5.2 Reservation lifecycle
- 5.2.1 Create reservation
- 5.2.2 Approval trigger evaluation
- 5.2.3 Modify and cancel flows

5.3 Admin reservation operations
- 5.3.1 List/filter/search
- 5.3.2 Approve and cancel actions

### 6. Admin Content CRUD
6.1 Menu management
- 6.1.1 CRUD categories/items/variants
- 6.1.2 Reorder endpoints

6.2 Gallery management
- 6.2.1 Upload pipeline and metadata
- 6.2.2 Alt-text validation

6.3 Testimonials and blog
- 6.3.1 CRUD and publish/unpublish
- 6.3.2 Sorting and visibility rules

6.4 Restaurant settings
- 6.4.1 Hours management
- 6.4.2 Reservation settings CRUD

### 7. Email & Notifications
7.1 Event-driven email flows
- 7.1.1 Guest confirmations/pending/modified/cancelled
- 7.1.2 Staff notifications

7.2 Local/dev delivery
- 7.2.1 Console/log sink for emails
- 7.2.2 SMTP config and provider abstraction

### 8. Background Jobs & Scheduling
8.1 Job runner framework
- 8.1.1 Queuing strategy
- 8.1.2 Retry policies and dead-letter handling

8.2 Scheduled jobs
- 8.2.1 Reservation token cleanup
- 8.2.2 Optional nightly reports or summary tasks

### 9. Observability & Ops
9.1 Logging and metrics
- 9.1.1 Structured request logs
- 9.1.2 Key business metrics (reservations, capacity)

9.2 Health checks and readiness
- 9.2.1 Liveness, dependency checks

9.3 Error tracking
- 9.3.1 Exception capture and alerting hooks

### 10. Deployment & Infrastructure
10.1 Environment configuration
- 10.1.1 Config schema and secrets management
- 10.1.2 Runtime env validation

10.2 Deployment pipeline
- 10.2.1 Containerization or platform template
- 10.2.2 Migration run strategy

10.3 Data backups
- 10.3.1 Backup cadence and recovery notes

### 11. QA & Testing Strategy
11.1 Unit testing
- 11.1.1 Reservation rules and capacity logic
- 11.1.2 Auth flows and token handling

11.2 Integration testing
- 11.2.1 API contract tests
- 11.2.2 Email and job execution tests

11.3 Load and abuse tests
- 11.3.1 Rate limit validation

### 12. Documentation & Template Packaging
12.1 Template configuration guide
- 12.1.1 Required settings and defaults
- 12.1.2 Customization checklist per restaurant

12.2 Admin runbook
- 12.2.1 Ops overview and common tasks

12.3 API reference
- 12.3.1 Public/admin endpoint docs
