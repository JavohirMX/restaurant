# VPS Ops Baseline (Docker, single host)

Target: one VPS runs **reverse proxy + frontend + backend + Postgres** via Docker Compose.

## Recommended topology (containers)

- `reverse-proxy` (TLS termination + static/security headers + routing)
- `frontend` (Next.js)
- `backend` (Django + DRF)
- `db` (Postgres)
- `media` volume (Docker volume mounted to backend for uploads/processed images)
- `backups` (optional sidecar for automated pg_dump + volume snapshots)

## Reverse proxy choice

Pick one for MVP:

- **Caddy** (recommended): simple automatic TLS, easy config.
- **Nginx**: ubiquitous, more manual TLS management (unless paired with certbot).
- **Traefik**: great with Docker labels; slightly more moving parts.

## Domains & DNS

- Create DNS records:
  - `A` record for `example.com` → VPS IP
  - `A` record for `www.example.com` → VPS IP (optional)
- Decide canonical host: either root or `www` (redirect the other).

## TLS

- TLS terminated at reverse proxy (Let’s Encrypt).
- Enforce HTTP→HTTPS redirect.
- HSTS: enable once you’re confident TLS is stable (can lock you in).

## Firewall & access

- Only expose:
  - 80/tcp (HTTP for ACME + redirect)
  - 443/tcp (HTTPS)
  - 22/tcp (SSH) — restrict by IP if possible
- Do **not** expose Postgres port publicly.

## Secrets & configuration

### Strategy

- Use environment variables for secrets (loaded by Docker Compose from an `.env` file stored on the VPS).
- Never commit `.env` to git.

### Expected env var categories (MVP)

- **Backend**: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `EMAIL_*`, `JWT_*`, `CSRF_TRUSTED_ORIGINS`, `MEDIA_ROOT`, `CORS_*` (if needed), `RATE_LIMIT_*`
- **Frontend**: `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (optional), `NEXT_PUBLIC_SITE_URL`
- **Database**: `POSTGRES_PASSWORD` etc.

## Backups (minimum viable)

- **Postgres**: nightly `pg_dump` stored off-host if possible (S3/Backblaze/etc). If on-host only, you still need a rotation policy.
- **Media volume**: nightly snapshot/rsync to off-host storage.
- **Restore drill**: perform at least one restore test before launch.

## Monitoring & logs (minimum viable)

- Container logs collected by Docker (stdout/stderr).
- Decide where logs go:
  - MVP: `docker logs` + basic rotation
  - Better: ship to Loki/Promtail or a hosted log provider
- Basic uptime checks:
  - HTTP check for `/` (frontend)
  - HTTP check for `/api/health` (backend, if implemented)

## Updates & maintenance

- Establish a routine:
  - Pull new images / build, run migrations, restart services.
- Keep OS patched (unattended upgrades optional).
- Track disk usage (Postgres + media can grow quickly).

## Security baseline

- Run containers as non-root where possible.
- Set `SECURE_*` settings in Django behind proxy (secure cookies, etc.) once the app exists.
- Rate-limit:
  - admin login endpoints
  - reservation create endpoint
- Consider fail2ban for SSH and/or login endpoints.

## docker-compose guidance (MVP)

Even before writing code, plan for:

- Named volumes: `pg_data`, `media_data`
- Internal Docker network for app↔db
- `backend` depends_on `db`
- Reverse proxy routes:
  - `/` → `frontend`
  - `/api/*` → `backend`
  - `/media/*` → backend or direct volume mount via proxy (decide later; backend-served is simplest for MVP)

## Launch checklist

- [ ] Domain points to VPS
- [ ] Reverse proxy obtains certificates
- [ ] Backups scheduled + verified
- [ ] Admin account created
- [ ] Staff inbox email sending verified
- [ ] Reservation email flows verified
- [ ] Basic monitoring in place
