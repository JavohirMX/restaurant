# Development Guide

This guide covers everything you need to know to develop the Restaurant Management Platform locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Daily Development Workflow](#daily-development-workflow)
4. [Environment Configuration](#environment-configuration)
5. [Database Operations](#database-operations)
6. [Testing](#testing)
7. [Code Style & Linting](#code-style--linting)
8. [Git Workflow](#git-workflow)
9. [Debugging](#debugging)
10. [Common Development Tasks](#common-development-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v24.0+): Containerization platform
- **Docker Compose** (v2.20+): Multi-container orchestration
- **Git**: Version control
- **Make** (optional): For convenience commands

### Verify Installation

```bash
docker --version      # Should show v24.0+
docker compose version  # Should show v2.20+
git --version         # Any recent version
```

---

## Initial Setup

Follow these steps to get the development environment running:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd restaurant
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and customize the values:

```bash
# Generate secure secrets (run these commands)
openssl rand -base64 48  # For SECRET_KEY
openssl rand -base64 48  # For JWT_SECRET (different from SECRET_KEY)
```

Update these in your `.env`:
- `SECRET_KEY`: Django secret (50+ characters)
- `JWT_SECRET`: JWT signing secret (different from SECRET_KEY)
- `POSTGRES_PASSWORD`: Database password

### 3. Start All Services

```bash
docker compose up -d
```

This command will:
- Pull and build Docker images
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Start Django backend on port 8000
- Start Next.js frontend on port 3000
- Run initial database migrations
- Collect static files

### 4. Verify Everything is Running

```bash
docker compose ps
```

All services should show `healthy` or `running` status.

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs/ (if configured)
- **Django Admin**: http://localhost:8000/admin/

### 6. Create a Superuser (Optional)

```bash
docker compose exec backend python manage.py createsuperuser
```

Follow the prompts to create an admin account.

---

## Daily Development Workflow

### Starting Your Day

```bash
# Pull latest changes
git pull origin main

# Start all services
docker compose up -d

# Check service status
docker compose ps
```

### During Development

```bash
# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f worker
```

### Ending Your Day

```bash
# Stop all services (keeps data)
docker compose stop

# Or stop and remove containers (data persists in volumes)
docker compose down
```

### Restarting Services

```bash
# Restart specific service
docker compose restart backend
docker compose restart frontend

# Restart all
docker compose restart
```

---

## Environment Configuration

### Environment Files

The project uses environment-specific configuration:

- **`.env`**: Local development (gitignored)
- **`.env.example`**: Template with default values
- **`.env.staging`**: Staging environment (if applicable)
- **`.env.production`**: Production environment (if applicable)

### Key Environment Variables

#### Database
```bash
POSTGRES_DB=restaurant
POSTGRES_USER=restaurant
POSTGRES_PASSWORD=your_secure_password
```

#### Django
```bash
DEBUG=true                          # Set to false in production
SECRET_KEY=your_50_char_secret      # Generate with openssl
ALLOWED_HOSTS=localhost,127.0.0.1   # Add production domains
CORS_ORIGINS=http://localhost:3000  # Frontend origin
JWT_SECRET=your_jwt_secret          # Different from SECRET_KEY
```

#### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Switching Environments

To use a different environment file:

```bash
docker compose --env-file .env.staging up -d
```

---

## Database Operations

### Running Migrations

```bash
# Apply all pending migrations
docker compose exec backend python manage.py migrate

# Check migration status
docker compose exec backend python manage.py showmigrations

# Create new migration
docker compose exec backend python manage.py makemigrations <app_name>
```

### Resetting the Database

```bash
# Remove volume and recreate
docker compose down -v
docker compose up -d

# Or just reset data while keeping structure
docker compose exec backend python manage.py flush
```

### Database Shell

```bash
# Access PostgreSQL shell
docker compose exec db psql -U restaurant -d restaurant

# Access Django shell
docker compose exec backend python manage.py shell

# Access Django shell plus (if installed)
docker compose exec backend python manage.py shell_plus
```

### Creating Backups

```bash
# Backup database
docker compose exec db pg_dump -U restaurant -d restaurant > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T db psql -U restaurant -d restaurant < backup_YYYYMMDD.sql
```

### Seeding Data

```bash
# Load fixtures
docker compose exec backend python manage.py loaddata fixtures/initial_data.json

# Create custom seed command (if implemented)
docker compose exec backend python manage.py seed_data
```

---

## Testing

### Backend Testing (pytest)

#### Running Tests

```bash
# Run all tests
docker compose exec backend pytest

# Run specific test file
docker compose exec backend pytest accounts/tests.py

# Run specific test class
docker compose exec backend pytest accounts/tests.py::UserTests

# Run specific test method
docker compose exec backend pytest accounts/tests.py::UserTests::test_create_user

# Run with verbose output
docker compose exec backend pytest -v

# Run with coverage
docker compose exec backend pytest --cov=accounts --cov=core --cov=menu
```

#### Test Configuration

Tests are configured in `backend/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
testpaths =
    accounts
    core
    menu
    reservations
    restaurant
```

#### Test Structure

Tests should follow this structure:

```python
# accounts/tests.py
import pytest
from django.test import TestCase
from accounts.models import User

class UserTests(TestCase):
    def setUp(self):
        # Setup code runs before each test
        pass
    
    def test_create_user(self):
        # Test implementation
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        assert user.email == 'test@example.com'
```

#### Test Fixtures

Common fixtures are available (if defined in `conftest.py`):

```python
# Example fixture usage
@pytest.mark.django_db
def test_user_creation(user_factory):
    user = user_factory()
    assert user.is_active
```

### Frontend Testing

The frontend testing setup is not yet fully configured. When ready:

```bash
cd frontend

# Run tests (when configured)
npm test

# Run tests in watch mode
npm test -- --watch
```

---

## Code Style & Linting

### Backend (Python)

The backend uses standard Python formatting tools:

```bash
# If ruff is configured
docker compose exec backend ruff check .
docker compose exec backend ruff format .

# Or use standard Python tools
docker compose exec backend black .
docker compose exec backend isort .
docker compose exec backend flake8
```

### Frontend (TypeScript/JavaScript)

```bash
cd frontend

# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Check TypeScript compilation
npx tsc --noEmit
```

### Pre-commit Hooks (Recommended)

Set up pre-commit hooks to enforce style:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

---

## Git Workflow

### Branch Naming Convention

```
feature/description    # New features
bugfix/description     # Bug fixes
hotfix/description     # Urgent production fixes
docs/description       # Documentation updates
refactor/description   # Code refactoring
test/description       # Test additions/updates
```

Examples:
```bash
git checkout -b feature/user-authentication
git checkout -b bugfix/reservation-timezone
git checkout -b docs/api-documentation
```

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:
```bash
git commit -m "feat(auth): add JWT token refresh endpoint"
git commit -m "fix(reservations): handle timezone conversion correctly"
git commit -m "docs(readme): update installation instructions"
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Make changes** with clear, atomic commits
3. **Test locally** before pushing
4. **Push branch** to remote
5. **Create PR** with description template
6. **Request review** from team members
7. **Address feedback** and update
8. **Merge** after approval (squash or merge commit)

---

## Debugging

### Viewing Logs

```bash
# All services logs
docker compose logs -f

# Specific service with timestamp
docker compose logs -f --timestamps backend

# Last 100 lines
docker compose logs --tail=100 backend

# Since specific time
docker compose logs --since=5m backend
```

### Backend Debugging

#### Using pdb (Python Debugger)

Add this to your code:

```python
import pdb; pdb.set_trace()
```

Then attach to the container:

```bash
# Run backend in interactive mode first
docker compose stop backend
docker compose run --rm --service-ports backend python manage.py runserver 0.0.0.0:8000

# When pdb breakpoint hits, you'll see the prompt
```

Or use `pdb++` or `ipdb` for enhanced debugging:

```python
import ipdb; ipdb.set_trace()
```

#### Django Debug Toolbar

If enabled, the debug toolbar will appear on the right side of pages in development mode.

#### Checking Database Queries

```bash
# Enable SQL logging
docker compose exec backend python manage.py shell
>>> from django.db import connection
>>> from accounts.models import User
>>> users = list(User.objects.all())
>>> print(connection.queries)
```

### Frontend Debugging

#### Browser DevTools

1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. **Network tab**: Monitor API requests
3. **Console tab**: View errors and logs
4. **React DevTools**: Inspect component tree
5. **Application tab**: Check localStorage, cookies

#### Next.js Debugging

```bash
# Debug mode
cd frontend
NODE_OPTIONS='--inspect' npm run dev

# Then attach debugger in Chrome (chrome://inspect)
```

#### React Query DevTools

React Query DevTools should be available in development mode at the bottom-right of the screen.

### Container Debugging

```bash
# Execute command in running container
docker compose exec backend ls -la
docker compose exec frontend sh

# Run new container instance for debugging
docker compose run --rm backend sh

# Check container resource usage
docker stats
```

---

## Common Development Tasks

### Adding a New Django App

```bash
# Create app
docker compose exec backend python manage.py startapp <app_name>

# Add to INSTALLED_APPS in config/settings.py
# Create models, views, serializers
# Run migrations
docker compose exec backend python manage.py makemigrations <app_name>
docker compose exec backend python manage.py migrate
```

### Adding Python Dependencies

Edit `backend/pyproject.toml`:

```toml
[project]
dependencies = [
    # ... existing deps
    "new-package>=1.0",
]
```

Rebuild:

```bash
docker compose down
docker compose up -d --build
```

### Adding Frontend Dependencies

```bash
cd frontend
npm install <package-name>

# Or dev dependency
npm install -D <package-name>
```

### Updating Database Schema

```bash
# Make migrations
docker compose exec backend python manage.py makemigrations

# Review migration file
cat backend/<app_name>/migrations/000X_auto.py

# Apply
docker compose exec backend python manage.py migrate

# If issues, rollback
docker compose exec backend python manage.py migrate <app_name> <previous_migration>
```

### Managing Static/Media Files

```bash
# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Media files are stored in volume and mounted at /app/media
```

### Working with the Worker

```bash
# View worker logs
docker compose logs -f worker

# Queue task manually
docker compose exec backend python manage.py shell
>>> from django_q.tasks import async_task
>>> async_task('accounts.tasks.send_email', 'arg1', 'arg2')
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check what's failing
docker compose ps

# View detailed logs
docker compose logs <service_name>

# Check for port conflicts
lsof -i :8000
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Stop conflicting services or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check database is running
docker compose ps db

# Verify environment variables
docker compose exec backend env | grep POSTGRES

# Test connection from backend
docker compose exec backend python -c "
import psycopg2
conn = psycopg2.connect(
    host='db',
    port=5432,
    database='restaurant',
    user='restaurant',
    password='your_password'
)
print('Connected!')
conn.close()
"

# Reset if needed
docker compose down -v
docker compose up -d
```

### Migration Errors

```bash
# Check migration status
docker compose exec backend python manage.py showmigrations

# Fake migration if already applied manually
docker compose exec backend python manage.py migrate --fake <app_name>

# Reset specific app
docker compose exec backend python manage.py migrate <app_name> zero
docker compose exec backend python manage.py migrate <app_name>
```

### Frontend Build Issues

```bash
# Clear Next.js cache
cd frontend
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart container
docker compose restart frontend
```

### Hot Reload Not Working

```bash
# Backend: Check file permissions
ls -la backend/

# Frontend: Check volume mounts
docker compose exec frontend ls -la /app

# Restart services
docker compose restart backend frontend
```

### Container Performance Issues

```bash
# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
docker volume prune

# Rebuild without cache
docker compose build --no-cache
```

### Permission Denied Errors

```bash
# Fix file ownership on Linux
sudo chown -R $USER:$USER backend/
sudo chown -R $USER:$USER frontend/

# Or use Docker user mapping
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# Clear Redis cache
docker compose exec redis redis-cli FLUSHALL
```

### API Not Responding

```bash
# Check backend health
curl http://localhost:8000/health/

# Check logs
docker compose logs backend

# Restart
docker compose restart backend
```

---

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| Start all services | `docker compose up -d` |
| Stop all services | `docker compose down` |
| View logs | `docker compose logs -f` |
| Run migrations | `docker compose exec backend python manage.py migrate` |
| Create superuser | `docker compose exec backend python manage.py createsuperuser` |
| Backend tests | `docker compose exec backend pytest` |
| Frontend lint | `cd frontend && npm run lint` |
| Restart service | `docker compose restart <service>` |
| Shell in container | `docker compose exec <service> sh` |

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Django Admin | http://localhost:8000/admin/ |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### File Locations

| Path | Description |
|------|-------------|
| `./backend/` | Django backend code |
| `./frontend/` | Next.js frontend code |
| `./docker-compose.yml` | Development services |
| `./.env` | Environment variables |
| `./backend/pytest.ini` | Test configuration |
| `./backend/pyproject.toml` | Python dependencies |
| `./frontend/package.json` | Node dependencies |

---

## Getting Help

If you encounter issues not covered here:

1. Check the logs: `docker compose logs <service>`
2. Review the [README.md](../README.md)
3. Check [API documentation](./API/CONTRACT.md)
4. Ask in the team chat or create an issue

---

*Last updated: 2026-01-31*
