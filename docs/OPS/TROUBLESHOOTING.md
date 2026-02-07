# Troubleshooting Guide

> **Restaurant Management Platform - Common Issues and Solutions**

This guide provides solutions for common operational issues. Follow the diagnostic steps before attempting fixes.

---

## Table of Contents

1. [HTTP 500 Errors](#http-500-errors)
2. [Database Connection Issues](#database-connection-issues)
3. [Redis Connection Issues](#redis-connection-issues)
4. [Email Not Sending](#email-not-sending)
5. [High Memory/CPU Usage](#high-memorycpu-usage)
6. [SSL/TLS Issues](#ssltls-issues)
7. [File Upload Issues](#file-upload-issues)
8. [Authentication Issues](#authentication-issues)
9. [Performance Issues](#performance-issues)
10. [Container Issues](#container-issues)

---

## HTTP 500 Errors

### Symptoms
- Users see "Internal Server Error" message
- API returns 500 status code
- Frontend shows error page

### Diagnostic Steps

```bash
# 1. Check recent error logs
docker compose logs --tail=100 backend | grep -A 10 "ERROR\|Traceback"

# 2. Check if database is accessible
docker compose exec backend python manage.py check --database default

# 3. Verify migrations are applied
docker compose exec backend python manage.py showmigrations | grep -v "[X]"

# 4. Check disk space
df -h
```

### Common Causes & Solutions

#### Missing Database Migration
```bash
# Apply pending migrations
docker compose exec backend python manage.py migrate

# Restart backend to clear any cached state
docker compose restart backend
```

#### Database Connection Pool Exhausted
```bash
# Check active connections
docker compose exec db psql -U restaurant -c "
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
"

# Restart backend to reset connections
docker compose restart backend
```

#### Import Error / Missing Dependency
```bash
# Rebuild backend container
docker compose up -d --build backend

# Check for missing imports in recent changes
docker compose exec backend python -c "import django; print(django.__version__)"
```

#### Memory Issues
```bash
# Check memory usage
docker stats --no-stream backend

# If memory limit reached, increase in docker-compose.yml
docker compose up -d
```

---

## Database Connection Issues

### Symptoms
- "could not connect to server" errors
- Intermittent connection failures
- Slow query responses

### Diagnostic Steps

```bash
# 1. Check if database container is running
docker compose ps db

# 2. Test database connectivity
docker compose exec db pg_isready -U restaurant

# 3. Check database logs
docker compose logs --tail=50 db

# 4. Verify connection settings
docker compose exec backend python -c "
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT 1')
print('Connection successful')
"
```

### Common Causes & Solutions

#### Container Not Running
```bash
# Start database container
docker compose up -d db

# Check for errors
docker compose logs db
```

#### Authentication Failed
```bash
# Verify credentials in environment
docker compose exec backend env | grep POSTGRES

# Reset database password (if needed)
docker compose exec db psql -U postgres -c "ALTER USER restaurant WITH PASSWORD 'newpassword';"
```

#### Connection Limit Reached
```bash
# View current connections
docker compose exec db psql -U restaurant -c "
SELECT pid, usename, application_name, state
FROM pg_stat_activity
WHERE datname = 'restaurant';
"

# Terminate idle connections (use with caution)
docker compose exec db psql -U restaurant -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < now() - interval '1 hour';
"
```

#### Disk Full
```bash
# Check disk space
df -h

# Check database size
docker compose exec db psql -U restaurant -c "
SELECT pg_size_pretty(pg_database_size('restaurant'));
"

# Clean up logs or old backups
find ./backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Redis Connection Issues

### Symptoms
- "Connection refused" errors
- Cache not working
- Session issues
- Background tasks not processing

### Diagnostic Steps

```bash
# 1. Check Redis container status
docker compose ps redis

# 2. Test Redis connection
docker compose exec redis redis-cli ping

# 3. Check Redis logs
docker compose logs --tail=50 redis

# 4. Check memory usage
docker compose exec redis redis-cli info memory
```

### Common Causes & Solutions

#### Redis Not Running
```bash
# Start Redis
docker compose up -d redis

# Verify it's responding
docker compose exec redis redis-cli ping
```

#### Memory Limit Reached
```bash
# Check memory usage
docker compose exec redis redis-cli info memory | grep used_memory

# Evict old keys manually (if needed)
docker compose exec redis redis-cli --eval "
local keys = redis.call('keys', '*')
for i=1, math.min(#keys, 1000) do
  redis.call('del', keys[i])
end
return #keys
"

# Or restart Redis (clears all cache)
docker compose restart redis
```

#### Connection Issues from Backend
```bash
# Test from backend container
docker compose exec backend python -c "
from django.core.cache import cache
cache.set('test', 'value', 30)
print(cache.get('test'))
"

# Check Redis URL configuration
docker compose exec backend env | grep REDIS
```

---

## Email Not Sending

### Symptoms
- Users don't receive confirmation emails
- Password reset emails not delivered
- No errors in application logs

### Diagnostic Steps

```bash
# 1. Check email backend configuration
docker compose exec backend env | grep EMAIL

# 2. Check email logs
docker compose logs --tail=100 backend | grep -i email

# 3. Test email configuration
docker compose exec backend python manage.py shell -c "
from django.core.mail import send_mail
from django.conf import settings
print(f'Email backend: {settings.EMAIL_BACKEND}')
print(f'From email: {settings.DEFAULT_FROM_EMAIL}')
"
```

### Common Causes & Solutions

#### SMTP Configuration Issues
```bash
# Verify SMTP settings
docker compose exec backend python -c "
import smtplib
from django.conf import settings

try:
    server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
    server.starttls()
    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
    print('SMTP connection successful')
    server.quit()
except Exception as e:
    print(f'SMTP error: {e}')
"
```

#### Email in Console Mode (Development)
```bash
# Check if using console backend
docker compose exec backend env | grep EMAIL_BACKEND_TYPE

# For production, should be set to 'smtp'
# Update in .env file: EMAIL_BACKEND_TYPE=smtp
```

#### SMTP Authentication Failed
```bash
# Test with telnet
docker compose exec backend sh -c "
echo 'QUIT' | nc -v \$EMAIL_HOST \$EMAIL_PORT
"

# Common fixes:
# - Use app-specific password for Gmail
# - Enable "Less secure apps" (not recommended)
# - Check firewall rules
```

#### Email Queue Issues (Django-Q)
```bash
# Check Django-Q status
docker compose exec backend python manage.py qinfo

# Check failed tasks
docker compose exec backend python manage.py shell -c "
from django_q.models import Failure
print(f'Failed tasks: {Failure.objects.count()}')
"
```

---

## High Memory/CPU Usage

### Symptoms
- System slow or unresponsive
- Docker containers using excessive resources
- OOM (Out of Memory) errors

### Diagnostic Steps

```bash
# 1. Check resource usage
docker stats --no-stream

# 2. Check system resources
free -h && df -h

# 3. Identify high-usage processes
docker compose top backend

# 4. Check for memory leaks in logs
docker compose logs --since=1h backend | grep -i "memory\|killed\|oom"
```

### Common Causes & Solutions

#### Memory Leak in Application
```bash
# Restart backend to free memory
docker compose restart backend

# Monitor memory over time
watch -n 5 'docker stats --no-stream backend'
```

#### Database Using Too Much Memory
```bash
# Check PostgreSQL memory settings
docker compose exec db psql -U restaurant -c "
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
"

# Adjust in docker-compose.yml if needed
```

#### Too Many Gunicorn Workers
```bash
# Check worker count in Dockerfile or config
# Recommended: (2 x $num_cores) + 1

# Temporarily scale down
docker compose up -d --scale backend=1
```

#### Large File Uploads
```bash
# Check uploaded files size
du -sh ./backend/media/

# Clean up old/temp files
find ./backend/media/temp -type f -mtime +7 -delete
```

---

## SSL/TLS Issues

### Symptoms
- Browser shows certificate warnings
- HTTPS not working
- Certificate expired errors

### Diagnostic Steps

```bash
# 1. Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 2. Verify certificate chain
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -text

# 3. Check certificate files
ls -la ./nginx/ssl/

# 4. Test SSL configuration
openssl s_client -connect your-domain.com:443 -tls1_3
```

### Common Causes & Solutions

#### Certificate Expired
```bash
# If using Let's Encrypt with Certbot
sudo certbot renew

# If using Caddy, it auto-renews - check Caddy logs
docker compose logs caddy

# Restart services to pick up new certificate
docker compose restart
```

#### Certificate Not Found
```bash
# Check certificate paths in nginx/Caddy config
docker compose exec nginx ls -la /etc/nginx/ssl/

# Verify volume mounts
docker compose config | grep -A 5 volumes
```

#### Mixed Content Warnings
```bash
# Check for HTTP resources on HTTPS page
# Update all URLs to use HTTPS
# Check NEXT_PUBLIC_SITE_URL and API_URL env vars
```

---

## File Upload Issues

### Symptoms
- Uploads fail with error
- Files not appearing in media directory
- "Permission denied" errors

### Diagnostic Steps

```bash
# 1. Check media directory permissions
ls -la ./backend/media/

# 2. Check disk space
df -h

# 3. Check upload size limits
docker compose exec backend python -c "
from django.conf import settings
print(f'Data upload max memory size: {settings.DATA_UPLOAD_MAX_MEMORY_SIZE}')
print(f'File upload max memory size: {settings.FILE_UPLOAD_MAX_MEMORY_SIZE}')
"

# 4. Check nginx client max body size
docker compose exec nginx nginx -T | grep client_max_body_size
```

### Common Causes & Solutions

#### Permission Denied
```bash
# Fix media directory permissions
sudo chown -R 1000:1000 ./backend/media/
sudo chmod -R 755 ./backend/media/

# Or run container as different user (check Dockerfile)
```

#### File Too Large
```bash
# Check current limits
docker compose exec nginx nginx -T | grep client_max_body_size

# Update nginx.conf
# client_max_body_size 20M;

docker compose restart nginx
```

#### Disk Full
```bash
# Check available space
df -h

# Clean up old files
find ./backend/media/ -type f -mtime +90 -delete
```

---

## Authentication Issues

### Symptoms
- Users can't log in
- JWT tokens not working
- Session expires too quickly

### Diagnostic Steps

```bash
# 1. Check JWT configuration
docker compose exec backend python -c "
from django.conf import settings
print(f'Access token lifetime: {settings.SIMPLE_JWT[\"ACCESS_TOKEN_LIFETIME\"]}')
print(f'Refresh token lifetime: {settings.SIMPLE_JWT[\"REFRESH_TOKEN_LIFETIME\"]}')
"

# 2. Check user status
docker compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.filter(email='test@example.com').first()
if user:
    print(f'Active: {user.is_active}')
    print(f'Staff: {user.is_staff}')
    print(f'Superuser: {user.is_superuser}')
"

# 3. Check recent login attempts
docker compose logs --tail=100 backend | grep -i "login\|auth"
```

### Common Causes & Solutions

#### Clock Skew (JWT Issues)
```bash
# Sync system time
sudo ntpdate pool.ntp.org

# Or use systemd-timesyncd
sudo timedatectl set-ntp true
```

#### CORS Issues
```bash
# Check CORS settings
docker compose exec backend env | grep CORS

# Verify origins are correct in settings
```

#### Session/Cookie Issues
```bash
# Check cookie settings
docker compose exec backend python -c "
from django.conf import settings
print(f'Session cookie secure: {settings.SESSION_COOKIE_SECURE}')
print(f'CSRF cookie secure: {settings.CSRF_COOKIE_SECURE}')
"

# For HTTP development, set SECURE_SSL_REDIRECT=false
```

---

## Performance Issues

### Symptoms
- Slow page loads
- API responses taking too long
- Database queries slow

### Diagnostic Steps

```bash
# 1. Check database query performance
docker compose exec backend python manage.py shell -c "
from django.db import connection
print(f'Queries: {len(connection.queries)}')
for q in connection.queries[:5]:
    print(f'{q[\"time\"]}s: {q[\"sql\"][:100]}...')
"

# 2. Check slow queries in PostgreSQL
docker compose exec db psql -U restaurant -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# 3. Check cache hit rate
docker compose exec redis redis-cli info stats | grep keyspace
```

### Common Causes & Solutions

#### Missing Database Indexes
```bash
# Check for missing indexes
docker compose exec db psql -U restaurant -c "
SELECT schemaname, tablename, attname as column
FROM pg_stats
WHERE schemaname = 'public'
AND n_tup_read > 10000
AND attname NOT IN (SELECT attname FROM pg_indexes WHERE tablename = pg_stats.tablename);
"

# Add indexes (requires migration)
```

#### N+1 Query Problem
```bash
# Enable query logging temporarily
# Add to settings.py: LOGGING['loggers']['django.db.backends'] = {'level': 'DEBUG'}

# Look for repeated similar queries in logs
```

#### Cache Not Working
```bash
# Test cache
docker compose exec backend python -c "
from django.core.cache import cache
import time

start = time.time()
cache.set('test_key', 'test_value', 300)
value = cache.get('test_key')
print(f'Cache test: {value} (took {time.time() - start:.3f}s)')
"

# Check Redis connection
docker compose exec redis redis-cli ping
```

---

## Container Issues

### Symptoms
- Containers won't start
- Containers keep restarting
- "Container unhealthy" status

### Diagnostic Steps

```bash
# 1. Check container status
docker compose ps

# 2. Check container logs
docker compose logs --tail=100 <service-name>

# 3. Check resource limits
docker system df

# 4. Inspect container
docker inspect <container-name>
```

### Common Causes & Solutions

#### Container Won't Start
```bash
# Check for port conflicts
sudo netstat -tlnp | grep 80
sudo netstat -tlnp | grep 443

# Check logs for startup errors
docker compose logs <service-name>

# Try starting in foreground to see errors
docker compose up <service-name>
```

#### Container Keeps Restarting
```bash
# Check restart policy
docker inspect <container-name> | grep -A 5 RestartPolicy

# Check exit code
docker inspect <container-name> | grep ExitCode

# Common exit codes:
# 0 = Success
# 1 = General error
# 137 = SIGKILL (OOM or manual kill)
# 143 = SIGTERM
```

#### Image Pull Failed
```bash
# Check Docker Hub status
# Try pulling manually
docker pull <image-name>

# Check network connectivity
docker run --rm busybox ping -c 4 google.com
```

---

## Emergency Contacts

| Issue Type | Escalation Path |
|------------|-----------------|
| Security Incident | security@your-domain.com |
| Data Loss | dba@your-domain.com |
| Complete Outage | oncall@your-domain.com |
| Performance Critical | infra@your-domain.com |

---

## Quick Fixes Reference

```bash
# Restart everything
docker compose restart

# Clear all caches
docker compose exec redis redis-cli FLUSHALL

# Reset database connections
docker compose restart backend

# View all logs
docker compose logs -f

# Emergency rollback
docker compose down
git checkout <previous-tag>
docker compose up -d
```

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
