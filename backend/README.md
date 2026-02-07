# Restaurant Management Platform - Django Backend

A modern, API-only Django backend for the Restaurant Management Platform. Provides RESTful APIs for restaurant operations, reservations, menu management, and staff administration.

## Overview

This backend serves a Next.js frontend and provides:

- **JWT Authentication** with role-based staff management
- **Restaurant Management** - profile, settings, hours, gallery, testimonials, blog
- **Reservation System** with token-based guest management
- **Menu Management** (Category, MenuItem with variants)
- **RESTful API** with public and admin endpoints
- **PostgreSQL** database with Redis caching
- **Comprehensive Testing** with pytest

## Tech Stack

- **Python**: 3.12+
- **Django**: 5.0+
- **Django REST Framework**: 3.14+
- **Authentication**: djangorestframework-simplejwt (JWT)
- **Database**: PostgreSQL (psycopg)
- **Cache**: Redis (django-redis)
- **CORS**: django-cors-headers
- **Rate Limiting**: django-ratelimit
- **Images**: Pillow
- **Task Queue**: Django-Q2
- **Testing**: pytest, pytest-django, factory-boy
- **Package Manager**: uv (recommended) or pip

## Prerequisites

- Python 3.12 or higher
- PostgreSQL 14+
- Redis 6+ (for caching and task queue)
- uv (`pip install uv`) or pip

## Project Structure

```
backend/
├── config/                 # Django project configuration
│   ├── settings.py         # Main settings
│   ├── urls.py            # URL routing
│   └── wsgi.py            # WSGI entry point
├── core/                   # Base models and shared utilities
│   ├── models.py          # TimestampedModel base
│   ├── permissions.py     # Custom permission classes
│   ├── pagination.py      # Cursor pagination
│   └── email/             # Email service
├── accounts/              # Staff user management
│   ├── models.py          # User model with roles
│   ├── views_admin.py     # Admin API endpoints
│   └── tests/             # Authentication tests
├── restaurant/            # Restaurant core
│   ├── models.py          # Restaurant, Settings, Gallery, etc.
│   ├── views_public.py    # Public API endpoints
│   └── views_admin.py     # Admin API endpoints
├── menu/                  # Menu management
│   ├── models.py          # Category, MenuItem, Variant
│   ├── views_public.py    # Public menu endpoints
│   └── views_admin.py     # Admin menu management
├── reservations/          # Reservation system
│   ├── models.py          # Reservation, ReservationSettings, Token
│   ├── views_public.py    # Public reservation endpoints
│   └── views_admin.py     # Admin reservation management
├── media/                 # Uploaded images
├── logs/                  # Application logs
├── manage.py              # Django management commands
├── pyproject.toml         # Project dependencies
└── pytest.ini             # Test configuration
```

## Installation

### Option 1: Using uv (Recommended)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment and install dependencies
uv venv
uv pip install -e .
uv pip install -e ".[dev]"

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows
```

### Option 2: Using pip

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -e .
pip install pytest pytest-django factory-boy freezegun responses coverage django-q2
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example .env
```

### Required Variables

```env
# Database
POSTGRES_DB=restaurant
POSTGRES_USER=restaurant
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Django
DEBUG=true
SECRET_KEY=your-secret-key-here-min-50-chars-long-for-security
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS & CSRF (for Next.js frontend)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# JWT (different from SECRET_KEY)
JWT_SECRET=your-jwt-secret-different-from-django-secret-key

# Email (console for development)
EMAIL_BACKEND_TYPE=console
DEFAULT_FROM_EMAIL=noreply@restaurant.local
STAFF_EMAIL=admin@restaurant.local

# SMTP (when EMAIL_BACKEND_TYPE=smtp)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://localhost:6379/0
```

### Generate Secure Keys

```bash
# Generate SECRET_KEY and JWT_SECRET
openssl rand -base64 48
```

## Database Setup

```bash
# Create PostgreSQL database
createdb restaurant

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

## Running Locally

### Without Docker

```bash
# Ensure PostgreSQL and Redis are running
# Then start the Django development server

python manage.py runserver

# Server runs at http://localhost:8000
```

### With Docker

```bash
# From project root
docker-compose up backend

# Or run all services
docker-compose up

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

### With Docker (Production Build)

```bash
docker-compose -f docker-compose.prod.yml up
```

## Development Workflow

### Database Migrations

```bash
# Create migration after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

### Create Superuser

```bash
python manage.py createsuperuser

# Follow prompts for email and password
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific app tests
pytest accounts/
pytest restaurant/
pytest menu/
pytest reservations/

# Run with coverage
pytest --cov=accounts --cov=core --cov=menu --cov=restaurant --cov=reservations

# Verbose output
pytest -v
```

## API Structure

### Base URLs

- **Development**: `http://localhost:8000`
- **API Version**: `/api/v1/`

### Endpoint Organization

```
/api/v1/public/           # Public endpoints (no auth)
├── restaurant/           # Restaurant info, hours, gallery, blog
├── menu/                 # Menu categories and items
└── reservations/         # Create reservations, check availability

/api/v1/admin/            # Admin endpoints (JWT auth required)
├── auth/                 # Login, refresh, logout
├── restaurant/           # Manage restaurant settings
├── menu/                 # Manage menu items
└── reservations/         # Manage reservations

/admin/                   # Django Admin interface
/health/                  # Health check endpoint
```

### Authentication

```bash
# Login (obtain tokens)
POST /api/v1/admin/auth/login/
{
    "email": "staff@restaurant.com",
    "password": "yourpassword"
}

# Response
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
        "id": 1,
        "email": "staff@restaurant.com",
        "role": "manager",
        "first_name": "John",
        "last_name": "Doe"
    }
}

# Use access token in requests
Authorization: Bearer <access_token>

# Refresh token
POST /api/v1/admin/auth/refresh/
{
    "refresh": "<refresh_token>"
}

# Logout (blacklist token)
POST /api/v1/admin/auth/logout/
Authorization: Bearer <access_token>
```

## Management Commands

```bash
# Django shell
python manage.py shell

# Check database connection
python manage.py dbshell

# Collect static files (production)
python manage.py collectstatic

# Clear cache
python manage.py clearcache

# Run Django-Q cluster (task queue)
python manage.py qcluster

# Check system health
python manage.py check

# Dump database
python manage.py dumpdata > backup.json

# Load database
python manage.py loaddata backup.json
```

## Development Tips

### Code Style

- Follow PEP 8
- Use type hints where possible
- Add docstrings to functions and classes

### Testing

- Write tests for all new features
- Use factories for test data
- Mock external services

### Database

- Never commit migrations without review
- Use transactions in management commands
- Index frequently queried fields

### Security

- Keep `.env` out of version control
- Use strong JWT_SECRET (different from SECRET_KEY)
- Enable rate limiting in production
- Validate all user input

### Debugging

```bash
# Django debug toolbar (if installed)
# Available at /__debug__/

# Enable SQL logging
python manage.py shell
>>> from django.db import connection
>>> connection.queries

# Check logs
tail -f logs/django.log
```

### Common Issues

**Migration conflicts:**
```bash
python manage.py makemigrations --merge
```

**Database locked:**
```bash
# Stop server, then:
python manage.py migrate --run-syncdb
```

**Redis connection:**
```bash
# Check Redis is running
redis-cli ping
```

## Production Deployment

See `.env.production.example` for production configuration:

- `DEBUG=false`
- `SECURE_SSL_REDIRECT=true`
- Use SMTP email backend
- Configure proper `ALLOWED_HOSTS`
- Set strong `SECRET_KEY` and `JWT_SECRET`
- Use PostgreSQL (not SQLite)
- Enable Redis caching
- Run Django-Q for background tasks

## License

[Add your license here]

## Support

For issues and feature requests, please use the project's issue tracker.
