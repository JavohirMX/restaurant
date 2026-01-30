# Reservation Policy Spec (MVP)

This document turns the reservation "knobs" from `PLAN.md` into concrete, testable requirements.

## Core configuration (defaults)

- **slotIntervalMinutes**: 30
- **turnTimeMinutes**: 90
- **maxGuestsPerSlot**: 40 (capacity per slot, across confirmed reservations only)
- **maxPartySizeOnline**: 8 (larger parties must call to book)
- **requirePhone**: true
- **minLeadTimeMinutes**: 120 (2 hours minimum notice)
- **maxDaysAhead**: 30 (1 month booking window)

## Availability & capacity rules

- **Slot generation**:
  - Generate reservation start times using configured `slotIntervalMinutes` within each service period.
  - A slot is available only if the reservation would fit entirely inside the service period window when applying `turnTimeMinutes`.
- **Capacity accounting**:
  - Capacity checks count **only confirmed** reservations.
  - For a requested start time `starts_at`, compute the set of slots overlapped by \([starts_at, starts_at + turnTimeMinutes)\) and ensure for each overlapped slot:
    - sum(confirmed.party_size) + requested.party_size ≤ `maxGuestsPerSlot`
  - If any overlapped slot would exceed capacity, reservation cannot be auto-confirmed.

## Reservation lifecycle

- **Statuses**: `pending`, `confirmed`, `cancelled`
- **Auto-confirm behavior**:
  - If capacity rules pass **and** no approval trigger matches → create `confirmed`.
  - Else → create `pending`.
- **Cancellation**:
  - Guest cancel via secure token link sets status to `cancelled`.
  - Admin cancel sets status to `cancelled` and records an audit event.

## Approval triggers (hybrid rules)

If any trigger matches, create/convert to `pending` and notify staff.

### Trigger: party size threshold
- If `party_size` > **approvalPartySizeThreshold** (6) → `pending`
- Parties of 7 or more require staff approval

### Trigger: same-day
- If reservation is for "today" in restaurant timezone and current time is within **sameDayWindowHours** (4) of the requested start time → `pending`
- Same-day bookings within 4 hours of start time require approval

### Trigger: configured time windows
- If requested start time falls within any "manual approval" windows → `pending`
- Admin can configure specific time windows (e.g., holiday periods) that always require approval
- Default: no configured windows (empty list)

### Trigger: near-capacity
- If confirming would bring any overlapped slot to ≥ **nearCapacityPercent** (85%) utilization:
  - utilization = (sum(confirmed.party_size) + requested.party_size) / maxGuestsPerSlot
  - if utilization ≥ 85% → `pending`

## Guest modify/cancel via token

- Guest receives a **secure token link** (token is unguessable).
- Guest can:
  - **View** reservation details
  - **Modify**: party size, start time, contact info, notes (at minimum: time + party size)
  - **Cancel**
- **Modification re-check**:
  - Re-run capacity checks and approval triggers.
  - If it would be auto-confirmed, update reservation and set status to `confirmed`.
  - Otherwise update reservation and set status to `pending`, notify staff.

## Token constraints

- Tokens should have an **expiry**: 30 days after reservation start.
- Token should be invalid once reservation is `cancelled`.
- Token should be rotateable (optional later) but not required for MVP.

## Notifications (who gets what)

- **Staff inbox** (single address):
  - New `pending` reservation
  - New `confirmed` reservation (optional; decide)
  - Guest cancel
  - Guest modification that results in `pending`
- **Guest**:
  - Confirmation (confirmed)
  - Pending received (pending)
  - Cancellation confirmation
  - Modification confirmation (and whether pending/confirmed)

## Abuse protections (MVP)

- Rate limit reservation creation endpoint: 10 requests/minute, 50/hour per IP.
- Optional honeypot field on reservation form (`website` field, reject if filled).

## Policy copy source

Guest-facing language should come from:
- `docs/CONTENT_PACK/reservation_copy.md`
