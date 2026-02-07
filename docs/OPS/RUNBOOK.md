# Operations Runbook

> **Restaurant Management Platform - Day-to-Day Operations Guide**

This runbook provides step-by-step instructions for common operational tasks. Keep this document updated as procedures change.

---

## Table of Contents

1. [Daily Operations Checklist](#daily-operations-checklist)
2. [System Health Checks](#system-health-checks)
3. [Log Management](#log-management)
4. [Service Management](#service-management)
5. [Scaling Operations](#scaling-operations)
6. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations Checklist

### Morning Checks (Start of Business Day)

```bash
# 1. Check system health
./scripts/health-check.sh

# 2. Check disk space
df -h

# 3. Check memory usage
free -h

# 4. Check running containers
docker compose ps

# 5. Check recent logs for errors
docker compose logs --tail=50 backend | grep -i error
docker compose logs --tail=50 frontend | grep -i error
```

### Evening Checks (End of Business Day)

```bash
# 1. Verify backup completed
ls -la ./backups/ | tail -5

# 2. Check reservation count for the day
docker compose exec backend python manage.py shell -c "
from reservations.models import Reservation
from django.utils import timezone
today = timezone.now().date()
count = Reservation.objects.filter(starts_at__date=today).count()
print(f'Reservations today: {count}')
"

# 3. Review error logs
docker compose logs --since=24h backend | grep -i error | tail -20
```

---

## System Health Checks

### Quick Health Check

Run the automated health check script:

```bash
./scripts/health-check.sh
```

Expected output:
```
✓ Backend API is responding
✓ Database connection is healthy
✓ Redis connection is healthy
✓ Frontend is responding
✓ SSL certificate is valid
✓ Disk space is adequate
```

### Manual Health Check

#### Backend API Health

```bash
# Check API health endpoint
curl -s https://api.your-domain.com/api/health/ | jq .

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-01-31T10:30:00Z",
#   "version": "1.0.0"
# }
```

#### Database Health

```bash
# Check database connection
docker compose exec db pg_isready -U restaurant

# Check active connections
docker compose exec db psql -U restaurant -c "
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
"
```

#### Redis Health

```bash
# Check Redis connection
docker compose exec redis redis-cli ping
# Expected: PONG

# Check Redis memory usage
docker compose exec redis redis-cli info memory | grep used_memory_human
```

#### Frontend Health

```bash
# Check frontend response
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com
# Expected: 200
```

---

## Log Management

### Viewing Logs

```bash
# View all service logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# View logs with time range
docker compose logs --since=1h backend
docker compose logs --since=30m --until=10m backend

# View logs with tail
docker compose logs --tail=100 backend
```

### Log Rotation

Logs are automatically rotated by Docker. Check rotation status:

```bash
# Check log sizes
docker system df -v

# Clean up old logs (if needed)
docker system prune --volumes
```

### Exporting Logs

```bash
# Export logs for specific time period
docker compose logs --since=24h backend > backend-logs-$(date +%Y%m%d).txt

# Export error logs only
docker compose logs --since=24h backend 2>&1 | grep -i error > errors-$(date +%Y%m%d).txt
```

---

## Service Management

### Restarting Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend

# Restart with zero downtime (if using multiple replicas)
docker compose up -d --no-deps --scale backend=2 backend
docker compose up -d --no-deps --scale backend=1 backend
```

### Stopping Services

```bash
# Stop all services gracefully
docker compose down

# Stop with timeout
docker compose down -t 60

# Stop and remove volumes (WARNING: destructive)
docker compose down -v
```

### Starting Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend

# Start with build
docker compose up -d --build
```

### Database Migrations

```bash
# Run migrations
docker compose exec backend python manage.py migrate

# Check migration status
docker compose exec backend python manage.py showmigrations

# Rollback specific migration (use with caution)
docker compose exec backend python manage.py migrate app_name zero
```

---

## Scaling Operations

### Horizontal Scaling

```bash
# Scale backend workers
docker compose up -d --scale backend=3 backend

# Scale with load balancer (requires additional configuration)
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Vertical Scaling

Edit `docker-compose.yml` to adjust resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

Then restart:
```bash
docker compose up -d
```

### Database Connection Scaling

Monitor and adjust connection pool:

```bash
# Check current connections
docker compose exec db psql -U restaurant -c "
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
"

# Adjust in settings.py if needed:
# DATABASES['default']['OPTIONS'] = {'MAX_CONNS': 20}
```

---

## Emergency Procedures

### Service Outage Response

1. **Immediate Assessment**
   ```bash
   ./scripts/health-check.sh
   docker compose ps
   ```

2. **Check Recent Changes**
   ```bash
   # Check recent deployments
   docker compose logs --since=1h backend | grep -i "starting\|error\|fatal"
   ```

3. **Restart Services**
   ```bash
   docker compose restart
   ```

4. **If Issue Persists - Rollback**
   ```bash
   # Revert to previous version
   docker compose pull backend:previous-tag
   docker compose up -d backend
   ```

### Database Emergency

1. **Connection Issues**
   ```bash
   # Restart database container
   docker compose restart db

   # Check for locks
   docker compose exec db psql -U restaurant -c "
   SELECT pid, state, query_start, query
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - query_start > interval '5 minutes';
   "
   ```

2. **Disk Space Issues**
   ```bash
   # Check disk usage
   df -h

   # Clean up old backups (keep last 30 days)
   find ./backups -name "*.sql.gz" -mtime +30 -delete

   # Vacuum database
docker compose exec db psql -U restaurant -c "VACUUM FULL;"
   ```

### High Load Response

1. **Identify Cause**
   ```bash
   # Check resource usage
   docker stats --no-stream

   # Check slow queries
docker compose exec db psql -U restaurant -c "
   SELECT query, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   "
   ```

2. **Mitigation Steps**
   - Enable rate limiting if not already active
   - Scale backend workers
   - Enable caching for frequently accessed data
   - Consider CDN for static assets

---

## Scheduled Maintenance

### Weekly Maintenance

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Clean up Docker
# Remove unused images
docker image prune -f
# Remove unused volumes
docker volume prune -f

# 3. Verify backups
./scripts/backup.sh database
./scripts/backup.sh media

# 4. Check SSL certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Monthly Maintenance

```bash
# 1. Review logs for patterns
docker compose logs --since=720h backend | grep -i error | sort | uniq -c | sort -rn

# 2. Analyze database performance
docker compose exec db psql -U restaurant -c "
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC
LIMIT 20;
"

# 3. Update dependencies (test in staging first)
docker compose exec backend pip list --outdated

# 4. Security updates
# Review and apply security patches
```

---

## Contact Information

| Role | Contact | Purpose |
|------|---------|---------|
| Primary On-Call | ops@your-domain.com | General issues |
| Security Team | security@your-domain.com | Security incidents |
| Database Admin | dba@your-domain.com | Database issues |
| Infrastructure | infra@your-domain.com | Infrastructure issues |

---

## Quick Reference

### Common Commands

```bash
# Full system status
docker compose ps && docker stats --no-stream

# Quick backup
./scripts/backup.sh all

# View recent errors
docker compose logs --since=1h backend 2>&1 | grep -i error

# Database shell
docker compose exec db psql -U restaurant

# Django shell
docker compose exec backend python manage.py shell

# Check SSL expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -enddate
```

### Important Paths

| Path | Description |
|------|-------------|
| `/var/lib/docker/volumes/` | Docker volumes |
| `./backups/` | Backup files |
| `./backend/logs/` | Application logs |
| `./frontend/.next/` | Next.js build output |

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
