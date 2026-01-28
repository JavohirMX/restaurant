# Restaurant Website (Django + Next.js) — Plan

## Overview
Reusable **single-restaurant** website template (intended to be reused via **separate deploy per restaurant**) with:
- **Frontend**: Next.js (public site + custom admin dashboard)
- **Backend**: Django + Django REST Framework (API-only)
- **Auth**: Staff login via email/password + **JWT access/refresh**
- **DB**: Postgres (from day 1)
- **Reservations**: built-in booking with per-timeslot capacity + hybrid approval rules
- **Media**: image processing on upload (resize/compress + thumbnails + WebP)

## Goals (MVP)
- **Public website**: home, menu (with variants), gallery, testimonials, blog, about, contact/location/hours (Google Maps embed).
- **Reservations**: guest submits party size + date/time + contact + notes; availability enforced by per-slot guest capacity; hybrid approval; guest can modify/cancel via secure link; staff + guest email flows.
- **Admin dashboard**: manage menu, gallery, testimonials, blog (rich text), hours, reservation settings, and reservations (approve/cancel).
- **SEO + accessibility**: semantic markup, metadata, sitemap/robots, structured data; good keyboard navigation; alt text required.
- **Language**: English only for MVP (structured to add i18n later).
- **Local-first**: develop/run locally for now; design with future deployment in mind.

## Key Decisions Locked In
- **Frontend framework**: Next.js
- **API auth**: JWT access/refresh
- **Admin permissions**: roles `admin` / `manager` / `host` / `editor`
- **Database**: Postgres now
- **Blog editor**: TipTap rich text
- **Spam protection**: basic rate limiting + optional honeypot
- **Analytics**: GA4 via env var (enabled only when configured)
- **Reservations**:
  - Availability limited by **per-timeslot max guests**
  - **Slot interval**: 30 minutes (configurable)
  - **Single global turn time**: 90 minutes (configurable)
  - Constraints: min lead time, max days ahead, max party size, require phone
  - Hybrid approval triggers: party size over N, same-day, configured time windows, near-capacity
- **Email**: basic HTML templates; staff notifications go to one inbox
- **Audit logs (basic)**: reservation actions + menu changes + blog changes
- **Admin UX**: drag-and-drop sorting

## Proposed Architecture
- **Backend (Django + DRF)**
  - API-only (no Django templates)
  - JWT auth + role-based permissions
  - Django admin kept for superuser/emergency access
- **Frontend (Next.js)**
  - Public pages rendered for SEO (SSR/SSG where appropriate)
  - Protected admin routes for content + reservation management

## Repo Layout (recommended)
- `backend/` Django project + apps: `accounts`, `cms`, `menu`, `reservations`
- `frontend/` Next.js app (public + admin)
- `docker-compose.yml` for Postgres in dev

## Data Model (initial)
- **Restaurant**
  - `Restaurant` (name, description, phone, email, address, geo, social links)
  - `RestaurantSettings` (timezone, GA4 measurement id optional, staff inbox email)
- **Hours**
  - `OpeningHours` / `ServicePeriod` (weekday schedule; multiple periods/day)
  - (future) special dates/holidays
- **Menu**
  - `MenuCategory` (name, sort)
  - `MenuItem` (category, name, description, photos, tags)
  - `MenuItemVariant` (optional per item; name/size, price, sort)
- **CMS**
  - `GalleryImage` (image, alt_text, sort)
  - `Testimonial` (name, rating, text, sort, published)
  - `BlogPost` (title, slug, TipTap body, cover image, published_at, seo fields)
- **Reservations**
  - `ReservationSettings` (slot interval = 30 min, max guests/slot, lead time, max days ahead, approval triggers, turn time = 90 min, max party)
  - `Reservation` (status pending/confirmed/cancelled, party_size, starts_at, guest info, notes)
  - `ReservationToken` (secure token for modify/cancel links + expiry)
- **Audit**
  - `AuditEvent` (actor, action, entity_type, entity_id, metadata, created_at)

## Booking Rules (MVP)
- **Slot generation**: based on opening hours/service periods and configured slot interval.
- **Capacity**: enforce `max_guests_per_slot` by summing **confirmed** reservations in that slot.
- **Hybrid approval**:
  - Auto-confirm if capacity allows and no approval trigger matched
  - Otherwise create as `pending` for staff approval
- **Turn time**: single global duration used for availability math (**90 minutes**).
- **Guest modify/cancel**: secure token link; modifications re-check capacity and may revert to `pending`.

## API Surface (high level)
- **Public (read-only)**
  - `GET /api/public/restaurant`
  - `GET /api/public/menu`
  - `GET /api/public/gallery`
  - `GET /api/public/testimonials`
  - `GET /api/public/blog` and `GET /api/public/blog/:slug`
  - `GET /api/public/reservations/availability?date=...`
- **Reservations**
  - `POST /api/public/reservations`
  - `GET /api/public/reservations/:token`
  - `PATCH /api/public/reservations/:token`
  - `POST /api/public/reservations/:token/cancel`
- **Admin (protected)**
  - CRUD: menu/categories/items/variants, gallery, testimonials, blog
  - CRUD: opening hours, reservation settings
  - `GET /api/admin/reservations` (filters) + approve/cancel endpoints
  - Auth: login/logout/me

## Email (local-first)
- **Dev**: console backend
- **Later**: SMTP provider via env vars
- **Templates**: basic HTML

## SEO + Accessibility + Analytics
- Metadata per page + OpenGraph, `sitemap.xml`, `robots.txt`
- JSON-LD: `Restaurant` / `LocalBusiness` + `BlogPosting`
- Accessibility: headings/landmarks, keyboard navigation, alt-text required
- GA4: enabled only when measurement id env var is set (no cookie banner for MVP per current requirements)

## Media Handling
- On upload: resize/compress, generate thumbnails, generate WebP variants
- Storage: local media for MVP; structure to migrate to S3-compatible storage later

## Spam & Abuse Protections
- Rate limit reservation creation + admin login endpoints
- Optional honeypot field on reservation form

## Background Jobs (planned, not required for MVP)
Keep design compatible with a job queue later (Celery/RQ) for:
- Async email sending
- Expired token cleanup
- Scheduled reminders

## Implementation Milestones (from the plan)
1. Scaffold monorepo (`backend/`, `frontend/`, Postgres dev)
2. Auth + role-based admin foundation
3. CMS + menu (variants + drag/drop sorting) + public pages
4. Blog (TipTap) + SEO
5. Reservations core (hours, slots, capacity, turn time, approval triggers)
6. Modify/cancel links via tokens
7. Admin reservations UI (approve/cancel) + audit events
8. Email notifications (guest + staff)
9. SEO + a11y + GA4 wiring
10. Local-dev polish (docs, seeds, key tests) + background job scaffolding plan

## Acceptance Criteria (MVP)
- Admin can manage site content + reservation settings without code changes.
- Guest can book and can modify/cancel via link; staff can approve/cancel.
- Staff and guests receive appropriate emails.
- Public site is crawlable and meets baseline accessibility.
