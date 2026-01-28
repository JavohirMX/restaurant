# Admin Roles & Permissions (MVP)

Roles from `PLAN.md`: `admin`, `manager`, `host`, `editor`.

## Principles

- **Least privilege**: each role can do only what they need.
- **Auditability**: actions that change public content or reservation state are logged.
- **No code changes for routine ops**: content + hours + settings editable in admin UI.

## Permission matrix

Legend: ✅ allowed, ⛔ denied, ⚠️ allowed with constraints

| Capability | admin | manager | host | editor |
|---|---:|---:|---:|---:|
| View admin dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage users / roles | ✅ | ⛔ | ⛔ | ⛔ |
| View audit log | ✅ | ✅ | ⚠️ (reservations-only) | ⚠️ (content-only) |
| Edit restaurant info (name/address/social) | ✅ | ✅ | ⛔ | ⛔ |
| Edit opening hours / service periods | ✅ | ✅ | ⛔ | ⛔ |
| Edit reservation settings (capacity, lead time, triggers) | ✅ | ✅ | ⛔ | ⛔ |
| View reservations list + details | ✅ | ✅ | ✅ | ⛔ |
| Approve pending reservation | ✅ | ✅ | ✅ | ⛔ |
| Cancel reservation | ✅ | ✅ | ✅ | ⛔ |
| Edit reservation (time/party/contact) | ✅ | ✅ | ✅ | ⛔ |
| Manage menu categories/items/variants | ✅ | ✅ | ⛔ | ✅ |
| Publish/unpublish menu items (if supported) | ✅ | ✅ | ⛔ | ✅ |
| Manage gallery images (upload/edit/sort/publish) | ✅ | ✅ | ⛔ | ✅ |
| Manage testimonials (create/edit/sort/publish) | ✅ | ✅ | ⛔ | ✅ |
| Manage blog posts (create/edit) | ✅ | ✅ | ⛔ | ✅ |
| Publish/unpublish blog posts | ✅ | ✅ | ⛔ | ⚠️ (optional; pick one policy below) |
| Edit SEO fields (title/description/OG) | ✅ | ✅ | ⛔ | ✅ |
| View system/health page (if present) | ✅ | ✅ | ⛔ | ⛔ |

## Blog publishing policy (choose one for MVP)

- **Option A (safer default)**: editor can create/edit drafts, but only `admin`/`manager` can publish.
- **Option B (faster)**: editor can publish/unpublish too.

## Audit events (MVP)

Store audit events for:

### Reservations

- Reservation created (guest) — include party size, starts_at, status
- Reservation approved (pending → confirmed)
- Reservation cancelled (by staff) — include reason (optional)
- Reservation cancelled (by guest) — via token
- Reservation modified (by guest token) — include before/after starts_at + party size + status transition
- Reservation modified (by staff) — include before/after + actor
- Reservation settings changed — include before/after snapshot (or changed fields)

### Content (menu/cms/blog)

- Menu category created/updated/deleted
- Menu item created/updated/deleted
- Menu variant created/updated/deleted
- Sort order changes (menu categories/items, gallery, testimonials)
- Gallery image uploaded/updated/deleted (including alt text edits)
- Testimonial created/updated/deleted
- Blog post created/updated/published/unpublished/deleted

### Restaurant config

- Opening hours/service period changed
- Restaurant profile changed (address/contact/social)

## Notes

- **Who counts as “actor”**: authenticated staff user; guest actions are recorded with `actor = null` and metadata indicating guest channel (token flow).\n+- **Retention**: MVP default keep indefinitely; if you want retention limits, define: max days or max rows.\n+
