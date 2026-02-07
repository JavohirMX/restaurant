# Developer Troubleshooting Guide

Quick solutions for common development issues in the Restaurant Management Platform.

---

## Table of Contents

1. [Quick Diagnostic Commands](#quick-diagnostic-commands)
2. [Docker Issues](#docker-issues)
3. [Database Issues](#database-issues)
4. [Backend Issues](#backend-issues)
5. [Frontend Issues](#frontend-issues)
6. [Environment Issues](#environment-issues)
7. [Network/Connectivity Issues](#networkconnectivity-issues)
8. [Performance Issues](#performance-issues)
9. [Getting Help](#getting-help)
10. [Emergency Fixes (Nuclear Options)](#emergency-fixes-nuclear-options)

---

## Quick Diagnostic Commands

Run these first to assess the situation:

```bash
# Check all container statuses
docker compose ps

# View logs for all services
docker compose logs --tail=100

# Check system resources
docker stats --no-stream

# Verify ports are available
lsof -i :3000 && lsof -i :8000 && lsof -i :5432 && lsof -i :6379

# Check disk space
df -h

# View recent errors across all services
docker compose logs --tail=50 | grep -i error
```

---

## Docker Issues

### Services Won't Start

**Symptoms:** `docker compose up` hangs or exits immediately

**Solutions:**

```bash
# Check which services are failing
docker compose ps

# View specific service logs
docker compose logs db
docker compose logs backend
docker compose logs frontend

# Check for dependency issues
docker compose config

# Restart with verbose output
docker compose up --verbose

# Force recreate containers
docker compose up -d --force-recreate
```

### Port Conflicts (3000, 8000, 5432, 6379)

**Symptoms:** `bind: address already in use`

**Solutions:**

```bash
# Find what's using the ports
lsof -i :3000
lsof -i :8000
lsof -i :5432
lsof -i :6379

# On Linux, kill the process using a port
kill -9 $(lsof -t -i:3000)

# Or stop the conflicting service
# Common culprits:
# - Another Docker container: docker stop <container_name>
# - Local PostgreSQL: sudo systemctl stop postgresql
# - Local Redis: sudo systemctl stop redis
# - Local Node.js: kill -9 $(lsof -t -i:3000)

# Use different ports in docker-compose.yml
docker compose up -d --force-recreate
```

**Alternative:** Modify `docker-compose.yml` to use different host ports:

```yaml
ports:
  - "3001:3000"  # Frontend on 3001 instead of 3000
  - "8001:8000"  # Backend on 8001 instead of 8000
```

### Container Crashes on Startup

**Symptoms:** Container starts then immediately exits with error code

**Solutions:**

```bash
# Check exit code
docker compose ps

# View full crash logs
docker compose logs <service_name>

# Check for missing environment variables
docker compose config

# Validate environment file exists
cat .env

# Run container with shell to debug
docker compose run --rm backend sh
docker compose run --rm frontend sh

# Check for syntax errors in entrypoint scripts
docker compose run --rm backend sh -c "cat /app/entrypoint.sh | head -20"
```

### Volume Permission Issues

**Symptoms:** `Permission denied` errors, can't write to volumes

**Solutions:**

```bash
# Fix ownership on Linux (container runs as root, host may differ)
sudo chown -R $USER:$USER ./backend
sudo chown -R $USER:$USER ./frontend

# Or set permissions
chmod -R 755 ./backend
chmod -R 755 ./frontend

# For database volume issues
docker compose exec db sh -c "chown -R postgres:postgres /var/lib/postgresql/data"

# Reset volumes (WARNING: loses data)
docker compose down -v
docker compose up -d

# Check volume mounts
docker compose exec backend ls -la /app
docker compose exec frontend ls -la /app
```

### Image Build Failures

**Symptoms:** `failed to solve`, `executor failed running`, build errors

**Solutions:**

```bash
# Clear build cache
docker compose build --no-cache

# Rebuild specific service
docker compose build --no-cache backend
docker compose build --no-cache frontend

# Check Docker daemon has enough resources
docker system info | grep -i "space\|memory"

# Free up disk space
docker system prune -f
docker volume prune -f

# Check Dockerfile syntax
docker build -f Dockerfile.backend .
docker build -f Dockerfile.frontend .
```

### "Cannot connect to the Docker daemon"

**Symptoms:** `Is the docker daemon running?`

**Solutions:**

```bash
# Linux - start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (logout/login required after)
sudo usermod -aG docker $USER

# macOS - start Docker Desktop
open -a Docker

# Windows - start Docker Desktop from Start Menu
# Or use: "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Verify Docker is running
docker info
docker version
```

---

## Database Issues

### "Database is not ready" / Connection Refused

**Symptoms:** Backend can't connect to PostgreSQL, `Connection refused`

**Solutions:**

```bash
# Check database container status
docker compose ps db

# Check database logs
docker compose logs db

# Verify PostgreSQL is accepting connections
docker compose exec db pg_isready -U restaurant

# Wait for database to be healthy
docker compose up -d db
docker compose exec db pg_isready -U restaurant -d restaurant

# Check if database is initialized
docker compose exec db psql -U restaurant -d restaurant -c "\dt"

# Restart with dependency order
docker compose down
docker compose up -d db
sleep 10  # Wait for DB to be ready
docker compose up -d backend
```

**Manual connection test:**

```bash
# Test connection from backend container
docker compose exec backend python -c "
import psycopg2
conn = psycopg2.connect(
    host='db',
    port=5432,
    database='restaurant',
    user='restaurant',
    password='restaurant_dev'
)
print('Connected successfully!')
conn.close()
"
```

### Migration Failures

**Symptoms:** `django.db.utils.ProgrammingError`, migration errors

**Solutions:**

```bash
# Check migration status
docker compose exec backend python manage.py showmigrations

# View specific migration errors
docker compose logs backend | grep -i migration

# Run migrations manually with verbose output
docker compose exec backend python manage.py migrate --verbosity=2

# Fix individual app migrations
docker compose exec backend python manage.py migrate <app_name>

# Fake a migration if already applied manually
docker compose exec backend python manage.py migrate <app_name> <migration_name> --fake

# Check for conflicting migrations
docker compose exec backend python manage.py makemigrations --check
```

### "Relation does not exist" Errors

**Symptoms:** `relation "X" does not exist`, table missing errors

**Solutions:**

```bash
# Tables not created - run migrations
docker compose exec backend python manage.py migrate

# Specific table missing - check migrations
docker compose exec backend python manage.py migrate <app_name>

# Database may be empty - check if tables exist
docker compose exec db psql -U restaurant -d restaurant -c "\dt"

# Reset migrations for a specific app (WARNING: data loss)
docker compose exec backend python manage.py migrate <app_name> zero
docker compose exec backend python manage.py migrate <app_name>

# If in development - reset entire database
docker compose down -v
docker compose up -d
```

### Data Persistence Issues

**Symptoms:** Data disappears after container restart

**Solutions:**

```bash
# Check volume exists
docker volume ls | grep postgres

# Verify volume is mounted correctly
docker compose exec db mount | grep postgresql

# Check data directory in container
docker compose exec db ls -la /var/lib/postgresql/data

# Ensure you're not using --rm flag when stopping
docker compose down  # Use this, not 'docker-compose rm'

# Verify named volume is used (not anonymous)
docker compose config | grep -A5 "volumes:"

# Backup and restore if needed
docker compose exec db pg_dump -U restaurant restaurant > backup.sql
docker compose exec -T db psql -U restaurant restaurant < backup.sql
```

### PostgreSQL Authentication Failures

**Symptoms:** `password authentication failed`, `role does not exist`

**Solutions:**

```bash
# Verify credentials in environment
cat .env | grep POSTGRES

# Check database users
docker compose exec db psql -U restaurant -c "\du"

# Reset password if needed
docker compose exec db psql -U postgres -c "ALTER USER restaurant WITH PASSWORD 'restaurant_dev';"

# Recreate database with correct credentials
docker compose down -v
docker compose up -d db

# Check pg_hba.conf for auth method
docker compose exec db cat /var/lib/postgresql/data/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

### Database Locked or Busy

**Symptoms:** `database is locked`, long-running queries

**Solutions:**

```bash
# Check active connections
docker compose exec db psql -U restaurant -c "
SELECT pid, state, query_start, query 
FROM pg_stat_activity 
WHERE state = 'active';
"

# Kill hanging queries
docker compose exec db psql -U restaurant -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction';
"

# Check for locks
docker compose exec db psql -U restaurant -c "
SELECT * FROM pg_locks 
WHERE NOT granted;
"

# Restart database if necessary
docker compose restart db
```

---

## Backend Issues

### Import Errors / Module Not Found

**Symptoms:** `ModuleNotFoundError`, `ImportError`

**Solutions:**

```bash
# Check Python path in container
docker compose exec backend python -c "import sys; print(sys.path)"

# Verify dependencies are installed
docker compose exec backend pip list

# Reinstall dependencies
docker compose exec backend pip install -r requirements.txt

# Check for circular imports
docker compose exec backend python -c "import <module_name>"

# Verify file exists
docker compose exec backend ls -la /app/<module_path>

# Check PYTHONPATH environment variable
docker compose exec backend echo $PYTHONPATH
```

### Django "Invalid HTTP_HOST header"

**Symptoms:** `Invalid HTTP_HOST header: '<host>'`, `You may need to add '<host>' to ALLOWED_HOSTS`

**Solutions:**

```bash
# Check current ALLOWED_HOSTS
docker compose exec backend python -c "from django.conf import settings; print(settings.ALLOWED_HOSTS)"

# Update environment variable in docker-compose.yml
# Or create .env file with:
echo "ALLOWED_HOSTS=localhost,127.0.0.1,backend,host.docker.internal" >> .env

# Restart backend to load new settings
docker compose restart backend

# For production, add your domain:
echo "ALLOWED_HOSTS=your-domain.com,www.your-domain.com" >> .env.production
```

### Static Files Not Collecting

**Symptoms:** 404 on static files, admin panel without CSS

**Solutions:**

```bash
# Check static files configuration
docker compose exec backend python -c "from django.conf import settings; print(settings.STATIC_URL, settings.STATIC_ROOT)"

# Collect static files manually
docker compose exec backend python manage.py collectstatic --noinput --clear

# Verify files were collected
docker compose exec backend ls -la /app/staticfiles/

# Check volume mount for static files
docker compose exec backend ls -la /app/staticfiles/admin/

# For development - ensure DEBUG=True
docker compose exec backend python -c "from django.conf import settings; print('DEBUG:', settings.DEBUG)"

# Restart nginx if serving static files through it
docker compose restart nginx
```

### 500 Errors with No Detail

**Symptoms:** HTTP 500, generic error page

**Solutions:**

```bash
# Enable debug mode temporarily
docker compose exec backend sh -c "export DEBUG=true && python manage.py runserver"

# Check backend logs
docker compose logs backend --tail=100

# View detailed error in logs
docker compose logs backend | grep -A 20 "ERROR"

# Check for unhandled exceptions
docker compose exec backend python manage.py check

# Verify database connection
docker compose exec backend python manage.py dbshell -c "SELECT 1;"

# Check for missing migrations
docker compose exec backend python manage.py showmigrations | grep -v "X"
```

### JWT Token Validation Failures

**Symptoms:** `Invalid token`, `Token expired`, `Signature verification failed`

**Solutions:**

```bash
# Check JWT_SECRET is set
cat .env | grep JWT_SECRET

# Verify JWT configuration
docker compose exec backend python -c "
from django.conf import settings
print('JWT config exists:', hasattr(settings, 'JWT_SECRET'))
"

# Check token expiration time
docker compose exec backend python -c "
import jwt
from django.conf import settings
token = '<paste_token_here>'
try:
    decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    print('Token valid:', decoded)
except jwt.ExpiredSignatureError:
    print('Token expired')
except jwt.InvalidTokenError as e:
    print('Invalid token:', e)
"

# Clear Redis cache if tokens are cached
docker compose exec redis redis-cli FLUSHDB

# Regenerate JWT_SECRET if compromised
openssl rand -base64 48
```

### CORS Errors

**Symptoms:** `CORS error`, `blocked by CORS policy`, `No 'Access-Control-Allow-Origin' header`

**Solutions:**

```bash
# Check CORS_ORIGINS environment variable
cat .env | grep CORS_ORIGINS

# Verify CORS middleware is installed
docker compose exec backend pip list | grep cors

# Check CORS configuration in Django
docker compose exec backend python -c "
from django.conf import settings
print('CORS origins:', getattr(settings, 'CORS_ALLOWED_ORIGINS', 'NOT SET'))
"

# Update CORS origins for your frontend URL
# In .env or docker-compose.yml:
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000

# For development, allow all (NOT for production!)
docker compose exec backend python -c "
import os
os.environ['CORS_ALLOW_ALL_ORIGINS'] = 'true'
"

# Restart backend after CORS changes
docker compose restart backend
```

### CSRF Token Missing/Invalid

**Symptoms:** `CSRF verification failed`, `CSRF token missing`

**Solutions:**

```bash
# Check CSRF_TRUSTED_ORIGINS
cat .env | grep CSRF_TRUSTED_ORIGINS

# Verify CSRF configuration
docker compose exec backend python -c "
from django.conf import settings
print('CSRF origins:', getattr(settings, 'CSRF_TRUSTED_ORIGINS', 'NOT SET'))
"

# Frontend must include CSRF token in requests
# Ensure withCredentials is set in axios/fetch:
# axios.defaults.withCredentials = true

# For API-only endpoints, use @csrf_exempt or ensure proper headers
# Headers needed:
# X-CSRFToken: <token>
# Cookie: csrftoken=<token>

# Check if CSRF cookie is being set
docker compose logs backend | grep -i csrf
```

### Email Backend Not Working

**Symptoms:** Emails not sending, no error but no email received

**Solutions:**

```bash
# Check email backend configuration
docker compose exec backend python -c "
from django.conf import settings
print('Email backend:', settings.EMAIL_BACKEND)
print('Email host:', getattr(settings, 'EMAIL_HOST', 'NOT SET'))
"

# For development - check console output
docker compose logs backend | grep -i email

# For SMTP - test connection
docker compose exec backend python -c "
import smtplib
smtp = smtplib.SMTP('smtp.gmail.com', 587)
smtp.starttls()
smtp.login('your-email@gmail.com', 'your-app-password')
print('SMTP connection successful')
smtp.quit()
"

# Check if emails are in queue (Django-Q)
docker compose exec backend python manage.py qinfo

# Send test email
docker compose exec backend python -c "
from django.core.mail import send_mail
from django.conf import settings
send_mail(
    'Test Subject',
    'Test message',
    settings.DEFAULT_FROM_EMAIL,
    ['test@example.com'],
    fail_silently=False
)
print('Email sent!')
"
```

### Image Upload Failures

**Symptoms:** `Permission denied`, upload fails silently, 413 Request Entity Too Large

**Solutions:**

```bash
# Check media directory permissions
docker compose exec backend ls -la /app/media/

# Verify MEDIA_ROOT and MEDIA_URL
docker compose exec backend python -c "
from django.conf import settings
print('MEDIA_ROOT:', settings.MEDIA_ROOT)
print('MEDIA_URL:', settings.MEDIA_URL)
"

# Check nginx max file size (if using nginx)
docker compose exec nginx cat /etc/nginx/nginx.conf | grep client_max_body_size

# Fix permissions
docker compose exec backend sh -c "chown -R www-data:www-data /app/media && chmod -R 755 /app/media"

# Check file upload handlers
docker compose exec backend python -c "
from django.conf import settings
print('FILE_UPLOAD_MAX_MEMORY_SIZE:', getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 'DEFAULT'))
print('DATA_UPLOAD_MAX_MEMORY_SIZE:', getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 'DEFAULT'))
"

# For nginx - increase max body size
docker compose exec nginx sh -c "echo 'client_max_body_size 50M;' > /etc/nginx/conf.d/upload.conf"
docker compose restart nginx
```

---

## Frontend Issues

### npm install Fails

**Symptoms:** `npm ERR!`, package installation errors, `node_modules` issues

**Solutions:**

```bash
# Clear npm cache
docker compose exec frontend npm cache clean --force

# Delete node_modules and reinstall
docker compose exec frontend rm -rf node_modules package-lock.json
docker compose exec frontend npm install

# Or from host machine:
cd frontend && rm -rf node_modules package-lock.json && npm install

# Check for lock file conflicts
cat frontend/package-lock.json | grep -i conflict

# Use specific Node version
docker compose exec frontend node --version

# If using volume mount issues, rebuild without cache
docker compose build --no-cache frontend
docker compose up -d frontend

# Check for network issues
docker compose exec frontend npm ping

# Alternative: use yarn
# docker compose exec frontend yarn install
```

### "Module not found" Errors

**Symptoms:** `Module not found: Can't resolve 'X'`, import errors

**Solutions:**

```bash
# Install missing dependency
docker compose exec frontend npm install <package-name>

# Check if module is installed
docker compose exec frontend ls -la node_modules/<package-name>

# Reinstall all dependencies
docker compose exec frontend rm -rf node_modules && npm install

# Check for case sensitivity issues (Linux vs macOS)
# Import: import MyComponent from './MyComponent'
# File:    mycomponent.tsx  <-- Wrong!

# Verify TypeScript paths configuration
cat frontend/tsconfig.json | grep -A5 paths

# Check for circular dependencies
docker compose exec frontend npm ls

# Clear Next.js cache
docker compose exec frontend rm -rf .next
```

### Hot Reload Not Working

**Symptoms:** Changes not reflecting, have to manually restart

**Solutions:**

```bash
# Check if watching files (Docker on macOS/Windows)
docker compose exec frontend sh -c "echo 'test' > /app/test.txt && cat /app/test.txt"

# For macOS - ensure proper volume mount
docker compose down
docker compose up -d frontend

# Check webpack HMR status
docker compose logs frontend | grep -i "hot\|hmr"

# Restart Next.js dev server
docker compose restart frontend

# Check file system events
docker compose exec frontend sh -c "which inotifywait || echo 'inotify not installed'"

# Increase fs.inotify.max_user_watches (Linux host)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

# Alternative: use polling mode (slower but more reliable)
# In frontend/package.json scripts:
# "dev": "next dev --poll 1000"
```

### Environment Variables Not Loading (NEXT_PUBLIC_)

**Symptoms:** `undefined`, `process.env.X` is empty, variables not available

**Solutions:**

```bash
# Check .env.local file exists
cat frontend/.env.local

# Verify NEXT_PUBLIC_ prefix
cat frontend/.env.local | grep NEXT_PUBLIC

# For Docker - check environment in container
docker compose exec frontend env | grep NEXT_PUBLIC

# Remember: Non-NEXT_PUBLIC_ variables only available in Node.js, not browser
docker compose exec frontend sh -c "node -e 'console.log(process.env)'"

# Restart frontend to reload env vars
docker compose restart frontend

# Check Next.js config
cat frontend/next.config.js | grep -i env

# For build-time env vars, rebuild required
docker compose down
docker compose up -d --build frontend
```

**Important:** Environment variables are loaded at build time. For changes to take effect:
- `NEXT_PUBLIC_*` variables: Need frontend restart or rebuild
- Server-side only variables: Need container restart

### API Connection Errors

**Symptoms:** `Network Error`, `Failed to fetch`, CORS errors, timeout

**Solutions:**

```bash
# Check API URL configuration
docker compose exec frontend env | grep NEXT_PUBLIC_API_URL

# Test connection from frontend container
docker compose exec frontend wget -qO- http://backend:8000/health/ || echo "Backend not reachable"

# Check if backend is healthy
docker compose ps backend

# Verify network connectivity
docker compose exec frontend ping backend

# Check for CORS issues (see CORS section above)
docker compose logs backend | grep -i cors

# Test API from host machine
curl http://localhost:8000/health/

# Check if using correct protocol (http vs https)
docker compose exec frontend env | grep API_URL

# For Docker networking issues, recreate network
docker compose down
docker network prune -f
docker compose up -d
```

### 404 on API Routes

**Symptoms:** `404 Not Found` on API endpoints

**Solutions:**

```bash
# Check if backend routes exist
curl http://localhost:8000/api/v1/

# Verify URL path is correct
docker compose exec frontend cat src/lib/api.ts | grep -i baseurl

# Check Django URL configuration
docker compose exec backend cat config/urls.py | grep -i "api\|path"

# Test with verbose output
curl -v http://localhost:8000/api/v1/<endpoint>/

# Check if trailing slash is required
curl http://localhost:8000/api/v1/endpoint    # Without trailing slash
curl http://localhost:8000/api/v1/endpoint/   # With trailing slash

# Verify nginx routing (if applicable)
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A5 "location /api"
```

### TypeScript Compilation Errors

**Symptoms:** `Type error`, `Cannot find module`, `Property does not exist`

**Solutions:**

```bash
# Check TypeScript version
docker compose exec frontend npx tsc --version

# Run type check
docker compose exec frontend npx tsc --noEmit

# Check for missing types
docker compose exec frontend npm install --save-dev @types/<package-name>

# Verify tsconfig.json
cat frontend/tsconfig.json

# Check for strict mode issues
docker compose exec frontend npx tsc --strict

# Skip type checking for build (temporary workaround)
# In next.config.js: typescript: { ignoreBuildErrors: true }

# Check for import path issues
docker compose exec frontend cat tsconfig.json | grep -A5 paths
```

### Tailwind Styles Not Applying

**Symptoms:** No styles, classes not working, raw HTML showing

**Solutions:**

```bash
# Check Tailwind configuration
cat frontend/tailwind.config.ts

# Verify content paths
docker compose exec frontend cat tailwind.config.ts | grep -A10 content

# Check if Tailwind is processing
docker compose exec frontend ls -la node_modules/tailwindcss

# Rebuild CSS
docker compose exec frontend npm run build

# Check for CSS import
docker compose exec frontend cat src/app/globals.css | head -10

# Verify PostCSS config
cat frontend/postcss.config.js

# Clear Next.js cache and rebuild
docker compose exec frontend rm -rf .next

# Check if JIT mode is working
docker compose exec frontend cat tailwind.config.ts | grep mode
```

### Hydration Mismatches

**Symptoms:** React hydration error, `Text content does not match`, console warnings

**Solutions:**

```bash
# Check for mismatched content between server and client
docker compose logs frontend | grep -i "hydrat"

# Common causes:
# 1. Using window/document in render without useEffect
# 2. Date/time formatting with locale differences
# 3. Random values in render
# 4. LocalStorage/sessionStorage access during SSR

# Fix patterns:
# - Wrap browser-only code in useEffect:
#   useEffect(() => { setWindowWidth(window.innerWidth) }, [])
#
# - Use suppressHydrationWarning for date/time:
#   <span suppressHydrationWarning>{new Date().toLocaleString()}</span>
#
# - Check for consistent initial state:
#   const [data, setData] = useState(null) // null on both server and client

# Disable SSR for problematic components (last resort)
# import dynamic from 'next/dynamic'
# const ClientComponent = dynamic(() => import('./Component'), { ssr: false })
```

---

## Environment Issues

### .env File Not Loaded

**Symptoms:** Variables undefined, defaults being used

**Solutions:**

```bash
# Check if .env file exists
ls -la .env

# Verify file format (no spaces around =)
cat .env | head -10

# Check file permissions
ls -la .env

# For Docker Compose, it loads .env automatically
docker compose config | grep -A5 environment

# Check if variables are set
docker compose exec backend env | grep SECRET_KEY
docker compose exec frontend env | grep NEXT_PUBLIC

# Explicitly specify env file
docker compose --env-file .env.local up -d

# Check for syntax errors (no spaces, no quotes needed usually)
# CORRECT: KEY=value
# WRONG: KEY = value
# WRONG: KEY="value" (usually works but can cause issues)
```

### Wrong Database Credentials

**Symptoms:** Authentication failed, cannot connect to database

**Solutions:**

```bash
# Check current credentials
cat .env | grep POSTGRES

# Verify credentials match in all locations
cat docker-compose.yml | grep POSTGRES
cat .env | grep POSTGRES
cat backend/.env | grep POSTGRES

# Update all .env files consistently
# POSTGRES_DB=restaurant
# POSTGRES_USER=restaurant
# POSTGRES_PASSWORD=restaurant_dev

# Reset database with new credentials
docker compose down -v
docker compose up -d db

# Verify connection
docker compose exec backend python manage.py dbshell
```

### Missing Required Environment Variables

**Symptoms:** `KeyError`, `NoneType`, Django configuration errors

**Solutions:**

```bash
# Check which variables are missing
docker compose exec backend python -c "
from django.conf import settings
print('Missing configs:')
for key in ['SECRET_KEY', 'JWT_SECRET', 'ALLOWED_HOSTS']:
    val = getattr(settings, key, None)
    if not val:
        print(f'  - {key} is not set')
"

# Verify against .env.example
diff .env .env.example

# Copy example file and customize
cp .env.example .env
# Edit .env with your values

# Check Django settings for required vars
cat backend/config/settings.py | grep -i "environ\|os.getenv"

# Required variables:
# - SECRET_KEY (min 50 chars)
# - JWT_SECRET (different from SECRET_KEY)
# - POSTGRES_PASSWORD
# - ALLOWED_HOSTS
# - CORS_ORIGINS
# - CSRF_TRUSTED_ORIGINS
```

### CORS Origin Misconfiguration

**Symptoms:** CORS errors in browser, API calls blocked

**Solutions:**

```bash
# Check current CORS settings
cat .env | grep CORS
docker compose exec backend python -c "
from django.conf import settings
print('CORS_ORIGINS:', getattr(settings, 'CORS_ALLOWED_ORIGINS', 'NOT SET'))
"

# Update with frontend URL
echo "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000" >> .env

# Restart backend
docker compose restart backend

# For production, add your domain:
# CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Check browser console for exact error message
# The error will show which origin was blocked
```

### SSL/HTTPS Issues in Production

**Symptoms:** Mixed content warnings, HTTPS redirect loops, insecure connection

**Solutions:**

```bash
# Check SSL redirect settings
cat .env.production | grep SSL_REDIRECT

# Verify HTTPS is enforced
docker compose exec backend python -c "
from django.conf import settings
print('SECURE_SSL_REDIRECT:', getattr(settings, 'SECURE_SSL_REDIRECT', 'NOT SET'))
"

# For nginx SSL configuration
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -i ssl

# Check certificate paths
docker compose exec nginx ls -la /etc/nginx/ssl/

# Update frontend API URL to use HTTPS
# NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Check for HSTS settings if causing issues
# SECURE_HSTS_SECONDS = 0  # Disable temporarily if needed
```

---

## Network/Connectivity Issues

### Services Can't Communicate

**Symptoms:** `Connection refused`, `No route to host`, `Name does not resolve`

**Solutions:**

```bash
# Check if containers are on same network
docker network ls
docker network inspect restaurant_restaurant_network

# Verify container network membership
docker compose exec backend cat /etc/hosts
docker compose exec frontend cat /etc/hosts

# Test connectivity between containers
docker compose exec frontend ping backend
docker compose exec backend ping db

# Check DNS resolution
docker compose exec backend nslookup db

# Recreate network
docker compose down
docker network prune -f
docker compose up -d

# Check firewall rules (Linux)
sudo iptables -L | grep -i docker

# Verify ports are exposed correctly
docker compose config | grep -A2 ports
```

### DNS Resolution Issues

**Symptoms:** `Temporary failure in name resolution`, `Name does not resolve`

**Solutions:**

```bash
# Check Docker DNS settings
docker compose exec backend cat /etc/resolv.conf

# Test DNS resolution
docker compose exec backend nslookup google.com
docker compose exec backend nslookup db

# Check Docker daemon DNS
docker system info | grep -i dns

# Restart Docker service
docker compose down
sudo systemctl restart docker
docker compose up -d

# Check if host DNS is working
ping -c 1 google.com

# Add DNS to Docker daemon config (Linux)
# /etc/docker/daemon.json:
# {
#   "dns": ["8.8.8.8", "8.8.4.4"]
# }
```

### Port Forwarding Not Working

**Symptoms:** `localhost:8000` not responding, ports not accessible from host

**Solutions:**

```bash
# Check if ports are mapped
docker compose ps

# Verify port binding
docker compose port backend 8000
docker compose port frontend 3000

# Check if ports are listening
docker compose exec backend netstat -tlnp | grep 8000
docker compose exec frontend netstat -tlnp | grep 3000

# Test from host
curl http://localhost:8000/health/
curl http://localhost:3000

# Check if service is actually running
docker compose logs backend | tail -20

# Verify no port conflicts
lsof -i :8000
lsof -i :3000
```

---

## Performance Issues

### Slow Page Loads

**Symptoms:** Pages take >3s to load, API responses slow

**Solutions:**

```bash
# Check container resource usage
docker stats --no-stream

# Monitor database performance
docker compose exec db psql -U restaurant -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"

# Check for N+1 queries
docker compose logs backend | grep -i "query\|SELECT" | tail -20

# Enable Django SQL logging temporarily
docker compose exec backend sh -c "
export DEBUG=true
python manage.py shell -c \"
import logging
logging.basicConfig(level=logging.DEBUG)
from django.db import connection
print('Queries:', len(connection.queries))
\"
"

# Check Redis cache hit rate
docker compose exec redis redis-cli info stats | grep keyspace

# Optimize images and static files
docker compose exec backend python manage.py collectstatic --noinput

# Check for memory leaks
docker stats --no-stream | grep restaurant
```

### Database Query N+1 Problems

**Symptoms:** Many similar queries, slow response times

**Solutions:**

```bash
# Enable query logging
docker compose exec backend python -c "
import logging
logging.getLogger('django.db.backends').setLevel(logging.DEBUG)
"

# Check for select_related/prefetch_related usage
docker compose exec backend grep -r "select_related\|prefetch_related" apps/

# Use Django Debug Toolbar (if installed)
# Check query count on page

# Fix common patterns:
# - Use select_related for foreign keys
# - Use prefetch_related for many-to-many
# - Example:
#   Order.objects.select_related('customer').prefetch_related('items')

# Check for query loops in code
docker compose logs backend | grep -c "SELECT" | tail -100
```

### Memory Usage Growing

**Symptoms:** Container memory increasing over time, OOM errors

**Solutions:**

```bash
# Monitor memory usage
docker stats --no-stream

# Check for memory leaks in Python
docker compose exec backend python -c "
import gc
import sys
print('Garbage collectable:', len(gc.get_objects()))
"

# Limit container memory
docker compose up -d --memory=1g backend

# Check for unclosed database connections
docker compose exec db psql -U restaurant -c "
SELECT count(*) FROM pg_stat_activity;
"

# Restart services to free memory
docker compose restart backend
docker compose restart frontend

# Check for large data in Redis
docker compose exec redis redis-cli info memory
```

### Container Using Too Much CPU

**Symptoms:** High CPU usage, system slow

**Solutions:**

```bash
# Check CPU usage
docker stats --no-stream

# Limit CPU for containers
docker compose up -d --cpus=1 backend

# Check for infinite loops
docker compose logs backend | grep -i "loop\|recursion"

# Profile Django code
docker compose exec backend python -c "
import cProfile
import django
django.setup()
cProfile.run('your_function()')
"

# Check for inefficient queries
docker compose exec db psql -U restaurant -c "
SELECT query, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 5;
"

# Reduce Gunicorn workers if needed
docker compose exec backend pkill -f gunicorn
docker compose exec backend gunicorn --bind 0.0.0.0:8000 --workers 1 config.wsgi:application
```

---

## Getting Help

### Where to Look for Information

1. **Application Logs:**
   ```bash
   # Backend logs
docker compose logs backend --tail=100
   
   # Frontend logs
docker compose logs frontend --tail=100
   
   # Database logs
docker compose logs db --tail=100
   
   # All logs combined
docker compose logs --tail=100
   ```

2. **Container Status:**
   ```bash
   docker compose ps
   docker stats
   docker system df
   ```

3. **Configuration Files:**
   - `.env` - Environment variables
   - `docker-compose.yml` - Service configuration
   - `backend/config/settings.py` - Django settings
   - `frontend/next.config.js` - Next.js configuration

4. **System Information:**
   ```bash
   docker version
   docker info
   docker system info
   ```

### Creating a Bug Report

When reporting issues, include:

```bash
# Run this to gather system info
echo "=== Docker Version ===" > debug_info.txt
docker version >> debug_info.txt 2>&1
echo "" >> debug_info.txt
echo "=== Docker Compose Config ===" >> debug_info.txt
docker compose config >> debug_info.txt 2>&1
echo "" >> debug_info.txt
echo "=== Container Status ===" >> debug_info.txt
docker compose ps >> debug_info.txt 2>&1
echo "" >> debug_info.txt
echo "=== Recent Logs ===" >> debug_info.txt
docker compose logs --tail=50 >> debug_info.txt 2>&1
```

### Debug Mode

Enable detailed logging:

```bash
# Backend debug mode
docker compose exec backend sh -c "export DEBUG=true && python manage.py runserver 0.0.0.0:8000"

# Django database query logging
docker compose exec backend python -c "
import logging
logging.getLogger('django.db.backends').setLevel(logging.DEBUG)
"

# Frontend verbose mode
docker compose exec frontend npm run dev --verbose
```

---

## Emergency Fixes (Nuclear Options)

Use these when nothing else works. **Warning: May result in data loss!**

### 1. Complete Environment Reset

```bash
# Stop all containers
docker compose down

# Remove all volumes (DELETES DATABASE DATA)
docker compose down -v

# Remove all images
docker compose down --rmi all

# Clear Docker system
docker system prune -af --volumes

# Rebuild from scratch
docker compose up -d --build
```

### 2. Database Reset (Development Only)

```bash
# Backup first if there's any data to save
docker compose exec db pg_dump -U restaurant restaurant > emergency_backup.sql

# Destroy and recreate database
docker compose down -v
docker compose up -d db
sleep 10

# Run migrations
docker compose run --rm backend python manage.py migrate

# Create superuser if needed
docker compose run --rm backend python manage.py createsuperuser
```

### 3. Frontend Complete Rebuild

```bash
# Remove everything
cd frontend
rm -rf node_modules package-lock.json .next

# Clean Docker volumes
docker compose down
docker volume prune -f

# Reinstall and rebuild
docker compose build --no-cache frontend
docker compose up -d frontend

# Verify
docker compose logs frontend
```

### 4. Network Reset

```bash
# Remove all networks
docker compose down
docker network prune -f

# Recreate
docker compose up -d

# Verify connectivity
docker compose exec frontend ping backend -c 3
docker compose exec backend ping db -c 3
```

### 5. Factory Reset (Last Resort)

```bash
# WARNING: This removes everything Docker-related
# Save any important data first!

# Stop all Docker containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network prune -f

# Clear build cache
docker builder prune -af

# Start fresh
git status
git checkout .  # Reset any local changes to tracked files
git clean -fd   # Remove untracked files (WARNING!)
docker compose up -d --build
```

---

## Quick Reference Card

```bash
# Daily Commands
docker compose up -d                    # Start all services
docker compose down                     # Stop all services
docker compose ps                       # Check status
docker compose logs -f                  # Follow logs
docker compose restart <service>        # Restart service

# Debugging
docker compose exec <service> sh        # Shell into container
docker compose logs <service> --tail=50 # View recent logs
docker stats                            # Resource usage

# Database
docker compose exec db psql -U restaurant -d restaurant  # DB shell
docker compose exec backend python manage.py migrate     # Run migrations
docker compose exec backend python manage.py shell       # Django shell

# Frontend
docker compose exec frontend npm install <pkg>  # Install package
docker compose exec frontend npm run dev        # Dev server
docker compose exec frontend npm run build      # Production build

# Emergency
docker compose down -v                  # Reset everything
docker system prune -af                 # Nuclear option
```

---

## Need More Help?

1. Check the project documentation in `/docs`
2. Review recent commits: `git log --oneline -20`
3. Search closed issues in the repository
4. Ask in the team Slack channel with:
   - Error message
   - Steps to reproduce
   - Output of `docker compose ps` and `docker compose logs <service>`

---

*Last updated: January 2026*
