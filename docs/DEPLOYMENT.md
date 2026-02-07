# Deployment Guide

This document provides comprehensive instructions for deploying the Restaurant Management Platform in various environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## Overview

The Restaurant Management Platform consists of:

- **Backend**: Django + Django REST Framework (Python 3.12)
- **Frontend**: Next.js 14+ (TypeScript)
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7
- **Reverse Proxy**: Nginx

All services are containerized using Docker and orchestrated with Docker Compose.

## Prerequisites

### Required Software

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git

### System Requirements

- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended for production)
- **Storage**: 20GB+ available
- **OS**: Linux (Ubuntu 22.04 LTS recommended) or macOS

## Environment Configuration

### Environment Files

Create the following environment files based on `.env.example`:

#### Local Development (`.env`)

```bash
# Database
POSTGRES_DB=restaurant
POSTGRES_USER=restaurant
POSTGRES_PASSWORD=your_secure_password_here

# Django
DEBUG=true
SECRET_KEY=your-secret-key-here-min-50-chars-long-for-security
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email (console for local development)
EMAIL_BACKEND_TYPE=console

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Production (`.env.production`)

```bash
# Database
POSTGRES_DB=restaurant
POSTGRES_USER=restaurant
POSTGRES_PASSWORD=your_very_secure_random_password

# Django
DEBUG=false
SECRET_KEY=your-production-secret-key-min-50-chars-long
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com
SECURE_SSL_REDIRECT=true
JWT_SECRET=your-jwt-secret-different-from-secret-key

# Email (SMTP for production)
EMAIL_BACKEND_TYPE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@your-domain.com
STAFF_EMAIL=admin@your-domain.com

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Deployment
DOMAIN=your-domain.com
GITHUB_REPOSITORY=yourusername/restaurant
IMAGE_TAG=latest
```

### Generating Secrets

Generate secure random strings for secrets:

```bash
# Generate a 64-character secret key
openssl rand -base64 48

# Generate JWT secret (different from SECRET_KEY)
openssl rand -base64 48

# Generate database password
openssl rand -base64 32
```

## Local Development

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd restaurant
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start all services**:
   ```bash
   ./scripts/deploy.sh local
   ```

   Or manually:
   ```bash
   docker compose up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin/
   - Health Check: http://localhost:8000/health/

### Development Commands

```bash
# View logs
docker compose logs -f [service]

# Run backend migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Run backend tests
docker compose exec backend pytest

# Run frontend tests
docker compose exec frontend npm test

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

## Staging Deployment

### Setup

1. **Provision a server** (Ubuntu 22.04 LTS recommended)

2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Configure GitHub Secrets**:
   - `STAGING_HOST`: Server IP or hostname
   - `STAGING_USER`: SSH username
   - `STAGING_SSH_KEY`: Private SSH key
   - `DOMAIN`: Your domain name

4. **Create environment file on server**:
   ```bash
   ssh user@staging-server
   mkdir -p /opt/restaurant-staging
   # Create .env.staging with staging configuration
   ```

### Automated Deployment

Staging deployments are automatic on pushes to `main` branch via GitHub Actions.

### Manual Deployment

```bash
# On the staging server
cd /opt/restaurant-staging

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Run migrations
docker compose -f docker-compose.prod.yml run --rm backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] Domain DNS configured
- [ ] Server firewall configured (ports 80, 443, 22)
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Secrets generated and stored securely

### Initial Setup

1. **Provision production server** (minimum 2 vCPU, 4GB RAM)

2. **Install Docker and Docker Compose** (same as staging)

3. **Create directory structure**:
   ```bash
   sudo mkdir -p /opt/restaurant
   sudo chown $USER:$USER /opt/restaurant
   cd /opt/restaurant
   ```

4. **Create production environment file**:
   ```bash
   nano .env.production
   # Add all production environment variables
   ```

5. **Create SSL directory** (if using custom certificates):
   ```bash
   mkdir -p nginx/ssl
   # Copy certificates:
   # - nginx/ssl/cert.pem
   # - nginx/ssl/key.pem
   ```

### Deployment Process

Production deployments are **manual** and require approval:

1. **Create a release tag**:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Trigger deployment via GitHub Actions**:
   - Go to Actions → Deploy to Production
   - Click "Run workflow"
   - Enter version tag (e.g., `v1.0.0`)
   - Type "deploy" to confirm
   - Click "Run workflow"

3. **Monitor deployment**:
   - Watch GitHub Actions logs
   - Check server health: `curl https://your-domain.com/health/`

### Manual Production Deployment

If needed, deploy manually:

```bash
# On production server
cd /opt/restaurant

# Set environment
export $(cat .env.production | xargs)

# Pull and deploy
./scripts/deploy.sh production v1.0.0
```

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

1. **Install certbot**:
   ```bash
   sudo apt install certbot
   ```

2. **Obtain certificates**:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
   ```

3. **Update Nginx configuration**:
   Edit `nginx/nginx.conf` and uncomment the HTTPS server block.

4. **Copy certificates to nginx**:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
   sudo chown -R $USER:$USER nginx/ssl
   ```

5. **Reload nginx**:
   ```bash
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

6. **Setup auto-renewal**:
   ```bash
   sudo certbot renew --dry-run
   # Add to crontab for automatic renewal
   ```

### Custom Certificates

Place your certificates in `nginx/ssl/`:
- `cert.pem` - Certificate chain
- `key.pem` - Private key

## Backup and Restore

### Automated Backups

The backup script supports database and media backups:

```bash
# Backup everything
./scripts/backup.sh

# Backup only database
./scripts/backup.sh database

# Backup only media files
./scripts/backup.sh media

# List available backups
./scripts/backup.sh list
```

### Backup Configuration

Set environment variables for backup behavior:

```bash
export BACKUP_DIR=/path/to/backups
export RETENTION_DAYS=30  # Keep backups for 30 days
```

### Restore from Backup

```bash
# Restore database
./scripts/backup.sh restore backups/db_backup_20240131_120000.sql.gz

# Restore media files (manual)
tar -xzf backups/media_backup_20240131_120000.tar.gz -C ./backend/
```

### Automated Backup Schedule

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * cd /opt/restaurant && ./scripts/backup.sh >> /var/log/restaurant-backup.log 2>&1
```

## Troubleshooting

### Common Issues

#### Services won't start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Verify environment variables
docker compose config
```

#### Database connection issues

```bash
# Check database container
docker compose ps db

# Verify database is ready
docker compose exec db pg_isready -U restaurant

# Check backend database settings
docker compose exec backend python -c "from django.conf import settings; print(settings.DATABASES)"
```

#### Static files not served

```bash
# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Check nginx configuration
docker compose exec nginx nginx -t
```

#### SSL certificate issues

```bash
# Verify certificate
docker compose exec nginx openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Check nginx SSL configuration
docker compose exec nginx nginx -t
```

### Health Checks

All services expose health endpoints:

- **Nginx**: `curl http://localhost/health`
- **Backend**: `curl http://localhost:8000/health/`
- **Frontend**: `curl http://localhost:3000`

### Getting Help

1. Check service logs: `docker compose logs -f [service]`
2. Review GitHub Actions logs for CI/CD issues
3. Verify environment configuration
4. Check system resources: `docker stats`

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong, unique passwords** for all services
3. **Keep secrets separate** from Docker images
4. **Regularly update** base images and dependencies
5. **Enable SSL/TLS** in production
6. **Configure firewall** rules appropriately
7. **Review and audit** access logs regularly

## Maintenance

### Regular Tasks

- **Weekly**: Review logs, check disk space
- **Monthly**: Update dependencies, review security alerts
- **Quarterly**: Rotate secrets, performance review

### Updates

```bash
# Update Docker images
docker compose pull
docker compose up -d

# Update system packages
sudo apt update && sudo apt upgrade
```

---

For additional support, refer to the project documentation or create an issue in the repository.
