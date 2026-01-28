# MVP Acceptance Criteria (testable)

These criteria refine `PLAN.md` into specific checks that must pass to call MVP “done”.

## Public site

- **Home page renders** and includes:
  - Restaurant name + tagline
  - Primary CTA to reservations and secondary CTA to menu
- **Menu page**:
  - Renders categories in correct sort order
  - Supports items with 0+ variants
  - Prices display in correct currency formatting
- **Gallery page**:
  - All images have **non-empty alt text**
  - Keyboard navigation reaches all interactive elements
- **Testimonials page/section**:
  - Shows only published testimonials, in sort order
- **About page**:
  - Shows about copy and key restaurant details
- **Contact/location/hours page**:
  - Displays hours and address
  - Includes Google Maps embed

## Reservations (guest)

- Guest can view availability for a selected date and see available times.
- Guest can submit a reservation with:
  - party size, date/time, name, email, (phone if required), notes optional
- Reservation creation enforces:
  - min lead time
  - max days ahead
  - max party size
  - opening hours/service periods
  - capacity rules (per-slot max guests) for confirmed reservations
- Reservation status:
  - Auto-confirms when capacity allows and no approval trigger matches
  - Creates pending when any approval trigger matches
- Guest receives an email that includes a **secure manage link**.
- Guest can open manage link and:
  - View reservation details
  - Modify reservation (time and/or party size at minimum)
  - Cancel reservation
- Guest modification:
  - Re-checks capacity and approval triggers
  - May convert confirmed → pending if triggers match

## Reservations (admin)

- Staff can log in with email/password and receive JWT auth tokens.
- Admin reservation list:
  - Filters by status
  - Filters by date range
  - Search by guest name/email/phone (basic contains search)
- Staff can approve pending reservations.
- Staff can cancel reservations.
- Reservation actions create audit events.

## Admin content management

- Menu CRUD:
  - Create/edit/delete categories, items, variants
  - Drag-and-drop sorting persists
- Gallery CRUD:
  - Upload image
  - Must supply alt text (validation prevents publish without alt)
  - Drag-and-drop sorting persists
- Testimonials CRUD:
  - Create/edit/publish/unpublish
  - Sorting persists
- Blog CRUD:
  - Create/edit posts with TipTap
  - Publish/unpublish works
  - Public blog index and detail render published posts only
- Hours + reservation settings can be edited in admin UI (no code changes).

## Email flows

- In local/dev mode, emails are visible in console/logs.
- In configured SMTP mode, emails send successfully for:
  - Guest: confirmed, pending, modified, cancelled
  - Staff inbox: pending created, (optional) confirmed created, modified→pending, cancelled

## SEO

- Pages include appropriate metadata (title/description).
- `sitemap.xml` and `robots.txt` are present.
- JSON-LD is present for:
  - Restaurant/LocalBusiness
  - BlogPosting on blog detail pages

## Accessibility (baseline)

- All pages have semantic landmarks and logical heading structure.
- All interactive controls are keyboard reachable.
- All images displayed in gallery have alt text (enforced by admin validation).

## Analytics (GA4)

- GA4 script loads **only** when measurement ID is configured.
- When not configured, no GA4 requests are sent.

