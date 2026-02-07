# Backup and Disaster Recovery

> **Restaurant Management Platform - Backup Procedures and Disaster Recovery**

This document outlines backup strategies, procedures, and disaster recovery protocols for the Restaurant Management Platform.

---

## Table of Contents

1. [Backup Overview](#backup-overview)
2. [Automated Backup Schedule](#automated-backup-schedule)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Backup Verification](#backup-verification)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Offsite Backup Strategy](#offsite-backup-strategy)

---

## Backup Overview

### What Gets Backed Up

| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL Database | `pg_dump` | Daily | 30 days |
| Media Files (uploads) | `rsync` | Daily | 30 days |
| Configuration Files | Git + manual | On change | Indefinite |
| SSL Certificates | Manual copy | On renewal | Until expiry |

### Backup Storage Locations

```
./backups/
├── database/
│   ├── restaurant_20260131_000000.sql.gz
│   └── ...
├── media/
│   ├── media_20260131_000000.tar.gz
│   └── ...
└── config/
    └── docker-compose.yml.backup
```

### Backup Tools

- **Database**: `pg_dump` with compression
- **Media Files**: `tar` with gzip compression
- **Automation**: `cron` + backup scripts
- **Offsite**: AWS S3 / Backblaze B2 / rsync.net

---

## Automated Backup Schedule

### Cron Configuration

Add to crontab (`crontab -e`):

```bash
# Database backup - daily at 2:00 AM
0 2 * * * cd /path/to/restaurant && ./scripts/backup.sh database >> /var/log/restaurant-backup.log 2>&1

# Media backup - daily at 2:30 AM
30 2 * * * cd /path/to/restaurant && ./scripts/backup.sh media >> /var/log/restaurant-backup.log 2>&1

# Full backup - weekly on Sunday at 3:00 AM
0 3 * * 0 cd /path/to/restaurant && ./scripts/backup.sh all >> /var/log/restaurant-backup.log 2>&1

# Cleanup old backups - daily at 4:00 AM
0 4 * * * cd /path/to/restaurant && find ./backups -name "*.gz" -mtime +30 -delete
```

### Systemd Timer (Alternative)

Create `/etc/systemd/system/restaurant-backup.service`:

```ini
[Unit]
Description=Restaurant Platform Backup

[Service]
Type=oneshot
WorkingDirectory=/path/to/restaurant
ExecStart=/path/to/restaurant/scripts/backup.sh all
User=restaurant
Group=restaurant
```

Create `/etc/systemd/system/restaurant-backup.timer`:

```ini
[Unit]
Description=Run Restaurant Backup Daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable restaurant-backup.timer
sudo systemctl start restaurant-backup.timer
```

---

## Manual Backup Procedures

### Database Backup

```bash
# Using the backup script
./scripts/backup.sh database

# Manual pg_dump
docker compose exec -T db pg_dump -U restaurant restaurant | gzip > ./backups/database/restaurant_$(date +%Y%m%d_%H%M%S).sql.gz

# With custom format (for selective restore)
docker compose exec -T db pg_dump -U restaurant -Fc restaurant > ./backups/database/restaurant_$(date +%Y%m%d_%H%M%S).dump
```

### Media Files Backup

```bash
# Using the backup script
./scripts/backup.sh media

# Manual backup
tar -czf ./backups/media/media_$(date +%Y%m%d_%H%M%S).tar.gz -C ./backend media/

# With progress bar
tar -czf ./backups/media/media_$(date +%Y%m%d_%H%M%S).tar.gz -C ./backend media/ --checkpoint=1000 --checkpoint-action=echo="Processed %u files"
```

### Full System Backup

```bash
# Backup everything
./scripts/backup.sh all

# Or individually
./scripts/backup.sh database
./scripts/backup.sh media

# Backup configuration
cp docker-compose.yml ./backups/config/docker-compose.yml.$(date +%Y%m%d)
cp .env ./backups/config/env.$(date +%Y%m%d)
```

### Pre-Deployment Backup

Always backup before deployments:

```bash
#!/bin/bash
# pre-deploy-backup.sh

BACKUP_DIR="./backups/pre-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Database
docker compose exec -T db pg_dump -U restaurant restaurant | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Media
tar -czf "$BACKUP_DIR/media_$TIMESTAMP.tar.gz" -C ./backend media/

# Config
cp docker-compose.yml "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml"
cp .env "$BACKUP_DIR/env_$TIMESTAMP"

echo "Pre-deployment backup complete: $BACKUP_DIR"
```

---

## Backup Verification

### Automated Verification

Add to backup script or run separately:

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE="$1"

if [[ $BACKUP_FILE == *.sql.gz ]]; then
    # Verify database backup
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo "✓ Database backup is valid"
        # Test restore to temp database
        docker compose exec -T db psql -U postgres -c "CREATE DATABASE test_restore;"
        if gunzip < "$BACKUP_FILE" | docker compose exec -T db psql -U restaurant -d test_restore 2>/dev/null; then
            echo "✓ Database backup is restorable"
        else
            echo "✗ Database backup restore test failed"
        fi
        docker compose exec db psql -U postgres -c "DROP DATABASE IF EXISTS test_restore;"
    else
        echo "✗ Database backup is corrupted"
    fi
elif [[ $BACKUP_FILE == *.tar.gz ]]; then
    # Verify media backup
    if tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
        echo "✓ Media backup is valid"
        echo "  Contents:"
        tar -tzf "$BACKUP_FILE" | head -20
    else
        echo "✗ Media backup is corrupted"
    fi
fi
```

### Manual Verification

```bash
# Check backup file size
ls -lh ./backups/database/

# Test gzip integrity
gunzip -t ./backups/database/restaurant_20260131_000000.sql.gz

# List contents of media backup
tar -tzf ./backups/media/media_20260131_000000.tar.gz | head -20

# Check backup age
find ./backups -name "*.gz" -mtime +7 -ls
```

### Monthly Restore Drill

Perform a test restore monthly:

```bash
#!/bin/bash
# monthly-restore-test.sh

TEST_DIR="/tmp/restore-test-$(date +%Y%m%d)"
BACKUP_FILE=$(ls -t ./backups/database/*.sql.gz | head -1)

mkdir -p "$TEST_DIR"

# Restore to test database
docker compose exec -T db psql -U postgres -c "CREATE DATABASE restore_test;"
gunzip < "$BACKUP_FILE" | docker compose exec -T db psql -U restaurant -d restore_test

# Verify data
count=$(docker compose exec -T db psql -U restaurant -d restore_test -t -c "SELECT count(*) FROM reservations_reservation;")
echo "Restored reservation count: $count"

# Cleanup
docker compose exec db psql -U postgres -c "DROP DATABASE restore_test;"
rm -rf "$TEST_DIR"

echo "Restore test completed successfully"
```

---

## Restore Procedures

### Database Restore

#### Full Database Restore

**⚠️ WARNING: This will overwrite current data!**

```bash
# 1. Stop the application
docker compose stop backend

# 2. Backup current database (just in case)
docker compose exec -T db pg_dump -U restaurant restaurant | gzip > ./backups/database/pre-restore_$(date +%Y%m%d_%H%M%S).sql.gz

# 3. Drop and recreate database
docker compose exec db psql -U postgres -c "DROP DATABASE IF EXISTS restaurant;"
docker compose exec db psql -U postgres -c "CREATE DATABASE restaurant OWNER restaurant;"

# 4. Restore from backup
gunzip < ./backups/database/restaurant_20260131_000000.sql.gz | docker compose exec -T db psql -U restaurant

# 5. Restart services
docker compose start backend

# 6. Verify
docker compose exec backend python manage.py check --database default
```

#### Selective Table Restore (from custom format)

```bash
# Restore specific table
docker compose exec -T db pg_restore -U restaurant -d restaurant --table=reservations_reservation ./backups/database/restaurant_20260131_000000.dump
```

#### Point-in-Time Recovery (if WAL archiving enabled)

```bash
# Requires WAL archiving configuration
# This is advanced - consult PostgreSQL documentation
```

### Media Files Restore

```bash
# 1. Backup current media
tar -czf ./backups/media/pre-restore_$(date +%Y%m%d_%H%M%S).tar.gz -C ./backend media/

# 2. Clear current media (optional)
# rm -rf ./backend/media/*

# 3. Extract backup
tar -xzf ./backups/media/media_20260131_000000.tar.gz -C ./backend/

# 4. Fix permissions
sudo chown -R 1000:1000 ./backend/media/
sudo chmod -R 755 ./backend/media/

# 5. Verify
ls -la ./backend/media/
```

### Complete System Restore

For disaster recovery (new server):

```bash
#!/bin/bash
# disaster-recovery.sh

BACKUP_DATE="20260131"
BACKUP_SERVER="backup-server:/backups"

# 1. Install Docker and Docker Compose
# (follow official Docker documentation)

# 2. Clone/pull application code
git clone https://github.com/yourorg/restaurant.git
cd restaurant

# 3. Download backups from offsite
scp "$BACKUP_SERVER/database/restaurant_${BACKUP_DATE}_000000.sql.gz" ./backups/database/
scp "$BACKUP_SERVER/media/media_${BACKUP_DATE}_000000.tar.gz" ./backups/media/

# 4. Start infrastructure (db, redis)
docker compose up -d db redis

# 5. Wait for database to be ready
sleep 10

# 6. Restore database
docker compose exec db psql -U postgres -c "CREATE DATABASE restaurant OWNER restaurant;"
gunzip < ./backups/database/restaurant_${BACKUP_DATE}_000000.sql.gz | docker compose exec -T db psql -U restaurant

# 7. Restore media
mkdir -p ./backend/media
tar -xzf ./backups/media/media_${BACKUP_DATE}_000000.tar.gz -C ./backend/

# 8. Start all services
docker compose up -d

# 9. Verify
curl -s http://localhost/api/health/

echo "Disaster recovery complete"
```

---

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Database corruption | 30 minutes | 24 hours |
| Complete server failure | 2 hours | 24 hours |
| Data center outage | 4 hours | 24 hours |
| Catastrophic failure | 8 hours | 24 hours |

### Disaster Recovery Plan

#### Level 1: Database Corruption

1. **Detection**: Monitoring alerts or user reports
2. **Assessment**: Determine extent of corruption
3. **Action**:
   - Stop writes to database
   - Restore from last good backup
   - Verify data integrity
   - Resume operations

#### Level 2: Server Failure

1. **Detection**: Health checks failing
2. **Action**:
   - Provision new server
   - Follow Complete System Restore procedure
   - Update DNS if IP changed
   - Verify SSL certificates

#### Level 3: Data Center Outage

1. **Detection**: Complete unavailability
2. **Action**:
   - Activate secondary region (if configured)
   - Or restore to new VPS in different region
   - Update DNS records
   - Notify users of maintenance window

### Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Incident Commander | oncall@your-domain.com | Coordinate response |
| Database Admin | dba@your-domain.com | Database recovery |
| Infrastructure | infra@your-domain.com | Server/infrastructure |
| Communications | comms@your-domain.com | User notifications |

---

## Offsite Backup Strategy

### AWS S3 Configuration

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Sync backups to S3
aws s3 sync ./backups/ s3://your-restaurant-backups/ --storage-class STANDARD_IA

# Or use rclone
rclone sync ./backups/ s3:your-restaurant-backups/
```

### Backblaze B2

```bash
# Install B2 CLI
pip install b2

# Authorize
b2 authorize-account <key-id> <application-key>

# Create bucket
b2 create-bucket restaurant-backups private

# Upload backup
b2 upload-file restaurant-backups ./backups/database/restaurant_20260131_000000.sql.gz database/restaurant_20260131_000000.sql.gz
```

### Automated Offsite Sync

Add to backup script or cron:

```bash
#!/bin/bash
# offsite-sync.sh

# Sync to S3
aws s3 sync ./backups/database/ s3://your-restaurant-backups/database/ --storage-class STANDARD_IA --delete
aws s3 sync ./backups/media/ s3://your-restaurant-backups/media/ --storage-class GLACIER --delete

# Keep only last 7 days in standard storage, move older to Glacier
aws s3api put-object-tagging \
    --bucket your-restaurant-backups \
    --key database/restaurant_$(date -d '8 days ago' +%Y%m%d)_000000.sql.gz \
    --tagging 'TagSet=[{Key=storage-class,Value=glacier}]'
```

### Backup Encryption

Encrypt backups before offsite storage:

```bash
# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-digest-algo SHA512 \
    --output ./backups/database/restaurant_20260131_000000.sql.gz.gpg \
    ./backups/database/restaurant_20260131_000000.sql.gz

# Decrypt
gpg --decrypt --output ./backups/database/restored.sql.gz \
    ./backups/database/restaurant_20260131_000000.sql.gz.gpg
```

---

## Backup Monitoring

### Health Checks

```bash
# Check backup completion (add to monitoring)
#!/bin/bash
# check-backup-health.sh

LATEST_DB=$(ls -t ./backups/database/*.sql.gz 2>/dev/null | head -1)
LATEST_MEDIA=$(ls -t ./backups/media/*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_DB" ] || [ $(find "$LATEST_DB" -mtime +1) ]; then
    echo "CRITICAL: Database backup is missing or older than 24 hours"
    exit 2
fi

if [ -z "$LATEST_MEDIA" ] || [ $(find "$LATEST_MEDIA" -mtime +1) ]; then
    echo "WARNING: Media backup is missing or older than 24 hours"
    exit 1
fi

echo "OK: Backups are current"
exit 0
```

### Backup Size Monitoring

```bash
# Monitor backup sizes
#!/bin/bash
# monitor-backup-size.sh

BACKUP_DIR="./backups"
ALERT_THRESHOLD=1000000  # 1GB in KB

for file in $(find "$BACKUP_DIR" -name "*.gz" -mtime -1); do
    size=$(du -k "$file" | cut -f1)
    if [ $size -gt $ALERT_THRESHOLD ]; then
        echo "WARNING: Large backup file: $file (${size}KB)"
    fi
done
```

---

## Quick Reference

```bash
# Create backup now
./scripts/backup.sh all

# Restore database
gunzip < backup.sql.gz | docker compose exec -T db psql -U restaurant

# Restore media
tar -xzf backup.tar.gz -C ./backend/

# Check backup integrity
gunzip -t backup.sql.gz

# List backups
ls -lt ./backups/database/
ls -lt ./backups/media/

# Sync to S3
aws s3 sync ./backups/ s3://bucket/backups/
```

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
