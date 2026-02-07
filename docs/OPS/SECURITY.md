# Security Procedures

> **Restaurant Management Platform - Security Operations and Incident Response**

This document outlines security procedures, incident response plans, and ongoing security maintenance for the Restaurant Management Platform.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Security Update Procedures](#security-update-procedures)
3. [Incident Response Plan](#incident-response-plan)
4. [Access Control Procedures](#access-control-procedures)
5. [Secrets Rotation](#secrets-rotation)
6. [Security Monitoring](#security-monitoring)
7. [Compliance Requirements](#compliance-requirements)

---

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access required for each role
3. **Fail Secure**: Default to secure configurations
4. **Audit Everything**: Log all security-relevant events
5. **Regular Updates**: Keep dependencies and systems patched

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Reverse Proxy (Nginx/Caddy)                                 │
│  - TLS termination                                           │
│  - Rate limiting                                             │
│  - WAF rules                                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   Frontend   │ │   Backend   │ │   Admin     │
│   (Next.js)  │ │   (Django)  │ │   Panel     │
└──────────────┘ └──────┬──────┘ └─────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  PostgreSQL  │ │    Redis    │ │   Media     │
│   Database   │ │    Cache    │ │   Storage   │
└──────────────┘ └─────────────┘ └─────────────┘
```

---

## Security Update Procedures

### Dependency Updates

#### Python Dependencies

```bash
# 1. Check for outdated packages
docker compose exec backend pip list --outdated

# 2. Update requirements in pyproject.toml
# Edit backend/pyproject.toml with new versions

# 3. Rebuild and test
docker compose up -d --build backend
./scripts/health-check.sh

# 4. Run tests
docker compose exec backend pytest

# 5. Deploy to production if tests pass
./scripts/deploy.sh production
```

#### Node.js Dependencies

```bash
# 1. Check for outdated packages
cd frontend && npm outdated

# 2. Update packages
npm update

# 3. Test build
npm run build

# 4. Deploy
./scripts/deploy.sh production
```

#### Docker Base Images

```bash
# 1. Check for base image updates
docker pull python:3.12-slim
docker pull node:20-alpine

# 2. Update Dockerfiles with new tags

# 3. Rebuild and test
docker compose up -d --build

# 4. Deploy
./scripts/deploy.sh production
```

### Security Patch Schedule

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical (CVSS 9.0-10.0) | 24 hours | Emergency patch |
| High (CVSS 7.0-8.9) | 72 hours | Scheduled patch |
| Medium (CVSS 4.0-6.9) | 2 weeks | Regular update |
| Low (CVSS 0.1-3.9) | Next maintenance | Include in regular update |

### Automated Security Scanning

```bash
# Python dependency scan
pip install safety
safety check -r backend/requirements.txt

# Docker image scan
docker scan restaurant-backend:latest
trivy image restaurant-backend:latest

# NPM audit
cd frontend && npm audit

# GitHub Dependabot (configured in repository)
# Automatically creates PRs for security updates
```

---

## Incident Response Plan

### Incident Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| P1 - Critical | System down or data breach | Ransomware, database exposed | 15 minutes |
| P2 - High | Major functionality impaired | Admin panel compromised | 1 hour |
| P3 - Medium | Minor security issue | Suspicious login attempts | 4 hours |
| P4 - Low | Potential vulnerability | Outdated dependency | 24 hours |

### Incident Response Team

| Role | Responsibility | Contact |
|------|----------------|---------|
| Incident Commander | Coordinate response, make decisions | oncall@your-domain.com |
| Technical Lead | Implement technical fixes | tech@your-domain.com |
| Communications | Internal/external communications | comms@your-domain.com |
| Legal/Compliance | Regulatory requirements, legal issues | legal@your-domain.com |

### Response Procedures

#### Phase 1: Detection & Assessment (0-15 min)

1. **Alert Received**
   - Monitoring system alert
   - User report
   - Security scan finding

2. **Initial Assessment**
   ```bash
   # Check system status
   ./scripts/health-check.sh
   
   # Review recent logs
   docker compose logs --since=1h backend | grep -i "error\|warn\|critical"
   
   # Check for unauthorized access
   docker compose exec backend python manage.py shell -c "
   from core.models import AuditEvent
   events = AuditEvent.objects.filter(event__contains='login').order_by('-created_at')[:20]
   for e in events:
       print(f'{e.created_at}: {e.event} - {e.metadata}')
   "
   ```

3. **Severity Classification**
   - Determine incident level
   - Notify appropriate team members
   - Create incident channel/document

#### Phase 2: Containment (15-60 min)

**For Active Breach:**

> **WARNING**: These commands affect live systems. Ensure you have proper authorization before executing.

```bash
# 1. Isolate affected systems
docker compose stop backend

# 2. Block suspicious IPs
# WARNING: This modifies firewall rules. Verify IP before blocking.
# Add to firewall/blocklist
iptables -A INPUT -s SUSPICIOUS_IP -j DROP

# 3. Disable compromised accounts
# WARNING: This immediately locks out the specified user account.
docker compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.get(email='compromised@example.com')
user.is_active = False
user.save()
"

# 4. Rotate exposed secrets
# See Secrets Rotation section
```

**For Vulnerability:**

```bash
# 1. Apply security patch
# Update affected dependency

# 2. Verify fix
docker compose up -d --build backend
./scripts/health-check.sh

# 3. Run security tests
# Verify vulnerability is patched
```

#### Phase 3: Eradication (1-4 hours)

1. **Remove Threat**
   - Delete malware/backdoors
   - Patch vulnerabilities
   - Remove unauthorized access

2. **System Hardening**
   ```bash
   # Review and update firewall rules
   # Enable additional logging
   # Implement additional rate limiting
   ```

#### Phase 4: Recovery (4-24 hours)

1. **Restore Services**
   ```bash
   # Gradually restore services
   docker compose up -d
   
   # Monitor closely
   watch -n 5 './scripts/health-check.sh'
   ```

2. **Verify Integrity**
   ```bash
   # Check file integrity
   find ./backend -type f -name "*.py" -exec md5sum {} \; | sort > current_checksums.txt
   diff baseline_checksums.txt current_checksums.txt
   
   # Verify database integrity
   docker compose exec db psql -U restaurant -c "SELECT pg_database_size('restaurant');"
   ```

#### Phase 5: Post-Incident (24-72 hours)

1. **Documentation**
   - Timeline of events
   - Actions taken
   - Lessons learned

2. **Communication**
   - Internal post-mortem
   - Customer notification (if required)
   - Regulatory reporting (if required)

3. **Improvement**
   - Update procedures
   - Implement preventive measures
   - Schedule security review

### Incident Response Checklist

```markdown
## Incident Response Checklist

### Immediate Actions
- [ ] Alert acknowledged
- [ ] Incident commander assigned
- [ ] Initial severity assessment
- [ ] Team notified

### Containment
- [ ] Affected systems isolated
- [ ] Evidence preserved
- [ ] Unauthorized access blocked
- [ ] Secrets rotated (if compromised)

### Eradication
- [ ] Threat removed
- [ ] Vulnerabilities patched
- [ ] Systems hardened

### Recovery
- [ ] Services restored
- [ ] Monitoring confirmed
- [ ] Integrity verified

### Post-Incident
- [ ] Timeline documented
- [ ] Post-mortem scheduled
- [ ] Improvements identified
- [ ] Stakeholders notified
```

---

## Access Control Procedures

### User Access Management

#### Adding New Staff User

```bash
# 1. Create user with appropriate role
docker compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.create_user(
    email='newstaff@restaurant.com',
    password='temporary-password-change-on-first-login',
    role='host',  # admin, manager, host, or editor
    is_staff=True
)
print(f'User created: {user.email}')
"

# 2. User must change password on first login
# 3. Enable 2FA (if implemented)
# 4. Add to appropriate groups
```

#### Removing Staff Access

```bash
# 1. Disable user account
docker compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.get(email='departing@restaurant.com')
user.is_active = False
user.save()
print(f'User disabled: {user.email}')
"

# 2. Invalidate all sessions
docker compose exec backend python manage.py shell -c "
from django.contrib.sessions.models import Session
from accounts.models import User
user = User.objects.get(email='departing@restaurant.com')
# Sessions are stored in Redis, clear user-specific data if any
"

# 3. Rotate any shared secrets the user had access to
```

#### Role Changes

```bash
# Update user role
docker compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.get(email='promoted@restaurant.com')
old_role = user.role
user.role = 'manager'  # New role
user.save()
print(f'Role changed from {old_role} to {user.role}')
"
```

### SSH Access Management

```bash
# Add SSH key for new admin
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC... newadmin@example.com
EOF

# Remove SSH key
# Edit ~/.ssh/authorized_keys and remove the line

# Audit SSH access
grep "Accepted publickey" /var/log/auth.log | tail -20
```

### API Key Management

```bash
# Generate new API key (if using API keys)
docker compose exec backend python manage.py shell -c "
import secrets
api_key = secrets.token_urlsafe(32)
print(f'New API key: {api_key}')
# Store securely and distribute
"

# Revoke API key
# Remove from database or mark as revoked
```

---

## Secrets Rotation

### Rotation Schedule

| Secret Type | Rotation Frequency | Last Rotated |
|-------------|-------------------|--------------|
| Django SECRET_KEY | Annually | 2026-01-01 |
| JWT_SECRET | Annually | 2026-01-01 |
| Database Password | Annually | 2026-01-01 |
| Email Password | Every 90 days | 2026-01-01 |
| API Keys | Every 90 days | 2026-01-01 |
| SSL Certificates | Before expiry | 2026-01-01 |

### Secrets Rotation Procedure

> **WARNING**: Secrets rotation will invalidate active sessions and require users to re-authenticate. Schedule during maintenance windows.

#### 1. Django SECRET_KEY

```bash
# 1. Generate new key
NEW_SECRET=$(openssl rand -base64 48)

# 2. Update .env file (don't commit!)
# WARNING: Never commit .env files to version control
echo "SECRET_KEY=$NEW_SECRET" >> .env.new

# 3. Graceful restart (sessions will be invalidated)
docker compose down
cp .env.new .env
docker compose up -d

# 4. Verify
./scripts/health-check.sh

# 5. Remove old .env file securely
# WARNING: shred may not work on all filesystems (e.g., CoW, networked)
shred -u .env.new 2>/dev/null || rm -f .env.new
```

#### 2. Database Password

```bash
# 1. Generate new password
NEW_DB_PASSWORD=$(openssl rand -base64 24)

# 2. Update database user
# WARNING: This will break existing connections until services are restarted
docker compose exec db psql -U postgres -c "ALTER USER restaurant WITH PASSWORD '$NEW_DB_PASSWORD';"

# 3. Update .env
# WARNING: Never commit .env files to version control
echo "POSTGRES_PASSWORD=$NEW_DB_PASSWORD" >> .env.new

# 4. Restart services
docker compose down
cp .env.new .env
docker compose up -d

# 5. Verify
docker compose exec backend python manage.py check --database default
```

#### 3. JWT_SECRET

```bash
# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 48)

# 2. Update .env
# WARNING: Never commit .env files to version control
echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env.new

# 3. Restart (all active JWTs will be invalidated - users must re-login)
docker compose down
cp .env.new .env
docker compose up -d

# 4. Notify users of required re-login
```

#### 4. SSL Certificates

```bash
# For Let's Encrypt with Certbot
sudo certbot renew --force-renewal

# For Caddy (auto-renews)
# Just verify: docker compose logs caddy | grep -i "certificate\|renew"

# Restart to pick up new certificate
docker compose restart nginx
```

### Secrets Validation

Run the secrets validation script:

```bash
./scripts/secrets-check.sh
```

Expected output:
```
✓ SECRET_KEY is set and meets length requirements
✓ JWT_SECRET is set and differs from SECRET_KEY
✓ POSTGRES_PASSWORD is strong
✓ EMAIL_HOST_PASSWORD is set
✓ No secrets in environment variables (except expected)
✓ SSL certificate is valid
```

---

## Security Monitoring

### Log Monitoring

#### Critical Events to Monitor

```bash
# Failed login attempts
docker compose logs backend | grep -i "login_failed"

# Permission denied errors
docker compose logs backend | grep -i "permission denied"

# 5xx errors
docker compose logs backend | grep "HTTP.*5[0-9][0-9]"

# Unusual API access patterns
docker compose logs backend | grep -E "(admin|api/v1/admin)" | tail -100
```

#### Automated Log Analysis

```bash
#!/bin/bash
# security-monitor.sh

# Check for brute force attempts
FAILED_LOGINS=$(docker compose logs --since=1h backend | grep -c "login_failed")
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "ALERT: $FAILED_LOGINS failed login attempts in last hour"
    # Send notification
fi

# Check for 5xx errors
ERRORS_500=$(docker compose logs --since=1h backend | grep -c "HTTP.*5[0-9][0-9]")
if [ $ERRORS_500 -gt 50 ]; then
    echo "ALERT: $ERRORS_500 server errors in last hour"
fi
```

### File Integrity Monitoring

```bash
# Create baseline checksums
find ./backend -type f \( -name "*.py" -o -name "*.sh" \) -exec md5sum {} \; > /var/lib/restaurant-baseline.md5

# Check for changes
md5sum -c /var/lib/restaurant-baseline.md5 | grep -v "OK$"

# Update baseline after legitimate changes
find ./backend -type f \( -name "*.py" -o -name "*.sh" \) -exec md5sum {} \; > /var/lib/restaurant-baseline.md5
```

### Network Monitoring

```bash
# Check for unusual connections
netstat -tuln | grep LISTEN

# Check firewall logs
iptables -L -n -v | grep DROP

# Monitor bandwidth usage
iftop -i eth0
```

---

## Compliance Requirements

### Data Protection (GDPR/CCPA)

#### Data Retention

| Data Type | Retention Period | Action After Period |
|-----------|------------------|---------------------|
| Reservation data | 2 years | Anonymize |
| Audit logs | 1 year | Archive |
| User accounts (inactive) | 2 years | Delete |
| Backup files | 30 days | Secure deletion |

#### Data Export (Right to Portability)

```bash
# Export user data
docker compose exec backend python manage.py shell -c "
import json
from accounts.models import User
from reservations.models import Reservation

user = User.objects.get(email='requester@example.com')
data = {
    'email': user.email,
    'role': user.role,
    'date_joined': str(user.date_joined),
    'reservations': list(Reservation.objects.filter(guest_email=user.email).values())
}
print(json.dumps(data, indent=2, default=str))
"
```

#### Right to be Forgotten

```bash
# Anonymize user data
docker compose exec backend python manage.py shell -c "
from accounts.models import User
from reservations.models import Reservation

user = User.objects.get(email='deletion-request@example.com')

# Anonymize reservations
Reservation.objects.filter(guest_email=user.email).update(
    guest_email='anonymized@deleted.user',
    guest_name='Deleted User',
    guest_phone=''
)

# Delete user account
user.delete()
print('User data anonymized and account deleted')
"
```

### Security Audit Trail

All security-relevant events are logged to the AuditEvent model:

- User logins (success/failure)
- Password changes
- Role changes
- Permission changes
- Configuration changes
- Data exports

Access audit logs:
```bash
docker compose exec backend python manage.py shell -c "
from core.models import AuditEvent
from datetime import datetime, timedelta

# Recent security events
events = AuditEvent.objects.filter(
    created_at__gte=datetime.now() - timedelta(days=7),
    event__in=['admin.login', 'admin.login_failed', 'user.password_changed']
).order_by('-created_at')

for e in events[:20]:
    print(f'{e.created_at}: {e.event} - {e.actor_id}')
"
```

---

## Security Contacts

| Role | Contact | Purpose |
|------|---------|---------|
| Security Team | security@your-domain.com | Security incidents |
| Data Protection Officer | dpo@your-domain.com | Privacy concerns |
| Infrastructure | infra@your-domain.com | Infrastructure security |
| Emergency | +1-XXX-XXX-XXXX | 24/7 security hotline |

---

## Quick Reference

```bash
# Check for security updates
pip list --outdated | grep -i "django\|crypto\|auth"
npm audit

# Rotate secrets
./scripts/secrets-check.sh

# Review access logs
docker compose logs --since=24h backend | grep -i "login\|auth\|permission"

# Block IP address
# WARNING: This modifies firewall rules. Verify IP before blocking.
iptables -A INPUT -s MALICIOUS_IP -j DROP

# Check SSL certificate
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
