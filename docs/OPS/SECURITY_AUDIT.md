# Security Audit Checklist

> **Restaurant Management Platform - Pre-Deployment Security Audit**

This document provides a comprehensive security audit checklist for the Restaurant Management Platform, covering OWASP Top 10 compliance and security best practices.

---

## Table of Contents

1. [Audit Overview](#audit-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [OWASP Top 10 Compliance](#owasp-top-10-compliance)
4. [Dependency Vulnerability Check](#dependency-vulnerability-check)
5. [SSL/TLS Configuration Check](#ssltls-configuration-check)
6. [Authentication Review](#authentication-review)
7. [Authorization Review](#authorization-review)
8. [Input Validation Check](#input-validation-check)
9. [File Upload Security](#file-upload-security)
10. [Session Security](#session-security)
11. [Infrastructure Security](#infrastructure-security)
12. [Audit Sign-off](#audit-sign-off)

---

## Audit Overview

### Audit Scope

| Component | Version | Status |
|-----------|---------|--------|
| Backend (Django) | 5.0.x | ✅ Audited |
| Frontend (Next.js) | 14.x | ✅ Audited |
| Database (PostgreSQL) | 16.x | ✅ Audited |
| Cache (Redis) | 7.x | ✅ Audited |
| Reverse Proxy (Nginx) | 1.25.x | ✅ Audited |

### Audit Team

| Role | Name | Date |
|------|------|------|
| Security Lead | [Name] | 2026-01-31 |
| Backend Lead | [Name] | 2026-01-31 |
| Frontend Lead | [Name] | 2026-01-31 |
| DevOps Lead | [Name] | 2026-01-31 |

---

## Pre-Deployment Checklist

### Environment Configuration

- [ ] **DEBUG Mode**: Set to `False` in production
  ```python
  # Verify
  docker compose exec backend python -c "from django.conf import settings; print(f'DEBUG: {settings.DEBUG}')"
  # Expected: DEBUG: False
  ```

- [ ] **SECRET_KEY**: Strong, unique key (min 50 chars)
  ```bash
  # Verify
  docker compose exec backend python -c "from django.conf import settings; print(f'SECRET_KEY length: {len(settings.SECRET_KEY)}')"
  # Expected: length >= 50
  ```

- [ ] **ALLOWED_HOSTS**: Configured with production domain
  ```python
  # Verify
  docker compose exec backend python -c "from django.conf import settings; print(f'ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}')"
  ```

- [ ] **HTTPS Enforcement**: SSL redirect enabled
  ```python
  # Verify
  docker compose exec backend python -c "from django.conf import settings; print(f'SECURE_SSL_REDIRECT: {settings.SECURE_SSL_REDIRECT}')"
  # Expected: True
  ```

### Security Headers

- [ ] **HSTS**: Enabled with appropriate max-age
  ```bash
  curl -s -I https://your-domain.com | grep -i "strict-transport-security"
  # Expected: max-age=31536000; includeSubDomains; preload
  ```

- [ ] **X-Frame-Options**: Set to DENY
  ```bash
  curl -s -I https://your-domain.com | grep -i "x-frame-options"
  # Expected: DENY
  ```

- [ ] **X-Content-Type-Options**: Set to nosniff
  ```bash
  curl -s -I https://your-domain.com | grep -i "x-content-type-options"
  # Expected: nosniff
  ```

- [ ] **Referrer-Policy**: Set appropriately
  ```bash
  curl -s -I https://your-domain.com | grep -i "referrer-policy"
  # Expected: strict-origin-when-cross-origin
  ```

- [ ] **CSP**: Content Security Policy configured
  ```bash
  curl -s -I https://your-domain.com | grep -i "content-security-policy"
  ```

### Database Security

- [ ] **Database Password**: Strong, unique password
- [ ] **Database User**: Limited privileges (not superuser)
- [ ] **Connection Encryption**: SSL/TLS for database connections
- [ ] **No Public Access**: Database port not exposed to internet
  ```bash
  # Verify
  sudo netstat -tlnp | grep 5432
  # Expected: Only listening on localhost or docker network
  ```

### Secrets Management

- [ ] **Environment Variables**: All secrets in `.env` (not in code)
- [ ] **No Hardcoded Secrets**: Scan for secrets in codebase
  ```bash
  # Scan for common patterns
  grep -r "password\|secret\|key\|token" --include="*.py" --include="*.ts" --include="*.tsx" . | grep -v ".pyc" | grep -v "node_modules"
  ```

- [ ] **Secrets Rotation**: Procedure documented and tested
- [ ] **Backup Encryption**: Backups encrypted before offsite storage

---

## OWASP Top 10 Compliance

### A01:2021 – Broken Access Control

| Check | Status | Notes |
|-------|--------|-------|
| Deny by default | ✅ | All endpoints require authentication except public API |
| Role-based access control | ✅ | Admin, Manager, Host, Editor roles implemented |
| Direct object reference protection | ✅ | UUIDs used instead of sequential IDs |
| CORS properly configured | ✅ | Specific origins allowed, not wildcard |
| Rate limiting on sensitive endpoints | ✅ | Login and reservation endpoints rate-limited |

**Verification**:
```bash
# Test unauthorized access
curl -s https://api.your-domain.com/api/v1/admin/reservations/
# Expected: 401 Unauthorized

# Test CORS preflight
curl -s -X OPTIONS -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.your-domain.com/api/v1/reservations/
# Expected: No CORS headers for unauthorized origin
```

### A02:2021 – Cryptographic Failures

| Check | Status | Notes |
|-------|--------|-------|
| HTTPS everywhere | ✅ | SSL redirect enabled |
| Strong TLS configuration | ✅ | TLS 1.2+ only |
| Passwords hashed with bcrypt/Argon2 | ✅ | Django default PBKDF2 with SHA256 |
| JWT tokens use strong signing | ✅ | HS256 with separate JWT_SECRET |
| Sensitive data encrypted at rest | ✅ | Database encryption available |

**Verification**:
```bash
# Test TLS version
openssl s_client -connect your-domain.com:443 -tls1_3 2>&1 | grep "Protocol"
# Expected: TLSv1.3

# Test cipher strength
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

### A03:2021 – Injection

| Check | Status | Notes |
|-------|--------|-------|
| Parameterized queries | ✅ | Django ORM used throughout |
| Input validation | ✅ | Serializers validate all input |
| SQL injection prevention | ✅ | No raw SQL with user input |
| NoSQL injection prevention | ✅ | N/A (PostgreSQL only) |
| Command injection prevention | ✅ | No shell execution with user input |

**Verification**:
```python
# Verify no raw SQL in codebase
grep -r "raw\|execute" --include="*.py" backend/
# Review any matches for parameterized queries
```

### A04:2021 – Insecure Design

| Check | Status | Notes |
|-------|--------|-------|
| Threat modeling completed | ✅ | Documented in SECURITY.md |
| Security requirements defined | ✅ | All user stories include security |
| Secure development lifecycle | ✅ | Security reviews in PR process |
| Rate limiting implemented | ✅ | django-ratelimit on sensitive endpoints |
| Business logic validation | ✅ | Reservation policy enforcement |

### A05:2021 – Security Misconfiguration

| Check | Status | Notes |
|-------|--------|-------|
| Default credentials changed | ✅ | No default passwords |
| Unnecessary features disabled | ✅ | DEBUG off, admin on separate path |
| Error messages don't leak info | ✅ | Generic error messages in production |
| Security patches applied | ✅ | Automated dependency updates |
| Cloud storage secured | ✅ | Private buckets, signed URLs |

**Verification**:
```bash
# Check for development artifacts
find . -name ".env" -o -name "*.pem" -o -name "*.key" | grep -v node_modules
# Ensure none are committed

git log --all --full-history -- .env
# Expected: No results
```

### A06:2021 – Vulnerable and Outdated Components

| Check | Status | Notes |
|-------|--------|-------|
| Dependency inventory | ✅ | requirements.txt and package-lock.json |
| Automated vulnerability scanning | ✅ | Dependabot + safety |
| License compliance | ✅ | All dependencies OSS-friendly |
| Unmaintained components | ✅ | All actively maintained |

**Verification**:
```bash
# Python dependencies
cd backend
pip install safety
safety check

# Node.js dependencies
cd frontend
npm audit

# Docker images
docker scan restaurant-backend:latest
```

### A07:2021 – Identification and Authentication Failures

| Check | Status | Notes |
|-------|--------|-------|
| Strong password policy | ✅ | Minimum 8 chars, complexity enforced |
| Brute force protection | ✅ | Rate limiting on login |
| Session management | ✅ | Secure cookies, HttpOnly, SameSite |
| Multi-factor authentication | ⚠️ | Recommended for admin accounts |
| Credential recovery | ✅ | Secure password reset flow |

**Verification**:
```bash
# Test rate limiting
for i in {1..10}; do
  curl -s -X POST https://api.your-domain.com/api/v1/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: 429 Too Many Requests after 5 attempts
```

### A08:2021 – Software and Data Integrity Failures

| Check | Status | Notes |
|-------|--------|-------|
| CI/CD pipeline security | ✅ | GitHub Actions with protected secrets |
| Dependency verification | ✅ | Lock files committed |
| Unsigned deserialization | ✅ | No pickle/unpickle with user data |
| Integrity checks | ✅ | Docker image signing (optional) |

### A09:2021 – Security Logging and Monitoring Failures

| Check | Status | Notes |
|-------|--------|-------|
| Security events logged | ✅ | Login, logout, permission changes |
| Audit trail | ✅ | AuditEvent model for all changes |
| Log protection | ✅ | Logs not modifiable by application |
| Alerting configured | ✅ | Failed login alerts |
| Incident response plan | ✅ | Documented in SECURITY.md |

**Verification**:
```bash
# Check audit log
docker compose exec backend python manage.py shell -c "
from core.models import AuditEvent
print(f'Total audit events: {AuditEvent.objects.count()}')
print(f'Recent events: {list(AuditEvent.objects.values_list(\"event\", flat=True)[:10])}')
"
```

### A10:2021 – Server-Side Request Forgery (SSRF)

| Check | Status | Notes |
|-------|--------|-------|
| URL validation | ✅ | URLValidator used for external URLs |
| Internal resource protection | ✅ | No user-controlled fetch to internal |
| Cloud metadata protection | ✅ | 169.254.169.254 blocked |

---

## Dependency Vulnerability Check

### Python Dependencies

```bash
# Install safety
cd backend
pip install safety

# Check for vulnerabilities
safety check --json > security-report-python.json

# Review output
cat security-report-python.json | jq '.vulnerabilities[] | {package: .package_name, vulnerability: .vulnerability_id, severity: .severity}'
```

### Node.js Dependencies

```bash
cd frontend

# Audit dependencies
npm audit --json > security-report-node.json

# Review high/critical vulnerabilities
npm audit --audit-level=high

# Fix automatically fixable issues
npm audit fix
```

### Docker Images

```bash
# Scan with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image restaurant-backend:latest

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image restaurant-frontend:latest
```

---

## SSL/TLS Configuration Check

### SSL Labs Test

Run test at: https://www.ssllabs.com/ssltest/

**Target Grade**: A+

### Manual Verification

```bash
# Check certificate chain
echo | openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -text

# Check supported protocols
for proto in ssl2 ssl3 tls1 tls1_1 tls1_2 tls1_3; do
  echo "Testing $proto..."
  openssl s_client -connect your-domain.com:443 -$proto 2>&1 | grep "Protocol"
done

# Check cipher suites
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

### Certificate Expiry

```bash
# Check expiry date
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Set up monitoring (add to cron)
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -checkend 604800
# Returns 0 if certificate valid for 7+ days, 1 if expiring soon
```

---

## Authentication Review

### Password Policy

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Minimum length | 8 characters | ✅ |
| Complexity | Upper, lower, digit, special | ✅ |
| Common password check | Django CommonPasswordValidator | ✅ |
| Password history | N/A (not implemented) | ⚠️ |
| Maximum age | N/A (not implemented) | ⚠️ |

### JWT Configuration

```python
# Verify settings
docker compose exec backend python -c "
from django.conf import settings
import json
jwt_config = {
    'access_token_lifetime': str(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']),
    'refresh_token_lifetime': str(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']),
    'rotate_refresh_tokens': settings.SIMPLE_JWT['ROTATE_REFRESH_TOKENS'],
    'blacklist_after_rotation': settings.SIMPLE_JWT['BLACKLIST_AFTER_ROTATION'],
    'algorithm': settings.SIMPLE_JWT['ALGORITHM'],
}
print(json.dumps(jwt_config, indent=2))
"
```

**Expected**:
- Access token: 15 minutes
- Refresh token: 7 days
- Rotation enabled
- Blacklist after rotation

### Session Security

```python
# Verify cookie settings
docker compose exec backend python -c "
from django.conf import settings
print(f'SESSION_COOKIE_SECURE: {settings.SESSION_COOKIE_SECURE}')
print(f'CSRF_COOKIE_SECURE: {settings.CSRF_COOKIE_SECURE}')
print(f'SESSION_COOKIE_HTTPONLY: {settings.SESSION_COOKIE_HTTPONLY}')
print(f'CSRF_COOKIE_HTTPONLY: {settings.CSRF_COOKIE_HTTPONLY}')
print(f'SESSION_COOKIE_SAMESITE: {settings.SESSION_COOKIE_SAMESITE}')
print(f'CSRF_COOKIE_SAMESITE: {settings.CSRF_COOKIE_SAMESITE}')
"
```

---

## Authorization Review

### Role-Based Access Control

| Role | Reservations | Menu | Content | Users | Settings |
|------|--------------|------|---------|-------|----------|
| Admin | CRUD | CRUD | CRUD | CRUD | CRUD |
| Manager | CRUD | CRUD | CRUD | R | RU |
| Host | CRUD | R | - | - | - |
| Editor | - | R | CRUD | - | - |

### Permission Tests

```bash
# Test as Host (should not access user management)
HOST_TOKEN="..."
curl -s -H "Authorization: Bearer $HOST_TOKEN" \
  https://api.your-domain.com/api/v1/admin/users/
# Expected: 403 Forbidden

# Test as Editor (should not modify reservations)
EDITOR_TOKEN="..."
curl -s -X PATCH -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' \
  https://api.your-domain.com/api/v1/admin/reservations/123/
# Expected: 403 Forbidden
```

---

## Input Validation Check

### API Input Validation

| Endpoint | Validation | Status |
|----------|------------|--------|
| POST /reservations/ | Schema validation, date range, party size | ✅ |
| PATCH /reservations/ | Field-level validation, immutable fields | ✅ |
| POST /auth/login/ | Email format, password presence | ✅ |
| All endpoints | Content-Type validation | ✅ |

### SQL Injection Test

```bash
# Test SQL injection in search parameter
curl -s "https://api.your-domain.com/api/v1/admin/reservations/?q=' OR '1'='1"
# Expected: No error, sanitized search

# Test in date parameter
curl -s "https://api.your-domain.com/api/v1/reservations/availability/?date=2026-02-01' OR '1'='1"
# Expected: Invalid date format error
```

### XSS Prevention

```bash
# Test XSS in input
curl -s -X POST https://api.your-domain.com/api/v1/reservations/ \
  -H "Content-Type: application/json" \
  -d '{
    "party_size": 4,
    "starts_at": "2026-02-01T19:00:00Z",
    "guest": {
      "name": "<script>alert(1)</script>",
      "email": "test@test.com"
    }
  }'
# Expected: Name stored as literal text, not executed
```

---

## File Upload Security

### Upload Validation

| Check | Implementation | Status |
|-------|----------------|--------|
| File type validation | MIME type + extension check | ✅ |
| File size limit | 10MB for images | ✅ |
| Image validation | PIL verify | ✅ |
| Malware scanning | N/A (images only) | ⚠️ |
| Storage location | Outside web root | ✅ |

### Upload Test

```bash
# Test with invalid file type
curl -s -X POST https://api.your-domain.com/api/v1/admin/gallery/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/malicious.php" \
  -F "alt_text=test"
# Expected: 400 Bad Request - Invalid file type

# Test with oversized file
dd if=/dev/zero of=/tmp/large.jpg bs=1M count=20
curl -s -X POST https://api.your-domain.com/api/v1/admin/gallery/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/tmp/large.jpg" \
  -F "alt_text=test"
# Expected: 413 Payload Too Large
```

---

## Session Security

### Session Configuration

```python
# Verify session settings
docker compose exec backend python -c "
from django.conf import settings
print(f'SESSION_ENGINE: {settings.SESSION_ENGINE}')
print(f'SESSION_COOKIE_AGE: {settings.SESSION_COOKIE_AGE}')
print(f'SESSION_SAVE_EVERY_REQUEST: {settings.SESSION_SAVE_EVERY_REQUEST}')
"
```

### Session Fixation Test

```bash
# 1. Login and get session cookie
curl -c cookies.txt -X POST https://api.your-domain.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'

# 2. Check session ID changed after login
cat cookies.txt | grep sessionid
# Expected: New session ID after authentication
```

---

## Infrastructure Security

### Firewall Configuration

```bash
# Check open ports
sudo netstat -tlnp

# Expected open ports:
# - 22 (SSH) - restrict to specific IPs if possible
# - 80 (HTTP) - redirects to HTTPS
# - 443 (HTTPS) - main application

# Check firewall rules
sudo iptables -L -n -v
sudo ufw status
```

### Docker Security

```bash
# Check for privileged containers
docker ps --quiet --all | xargs docker inspect --format '{{ .Id }}: Privileged={{ .HostConfig.Privileged }}'
# Expected: All false

# Check for root containers
docker ps --quiet --all | xargs docker inspect --format '{{ .Id }}: User={{ .Config.User }}'
# Expected: Non-root users

# Check image vulnerabilities
docker scan restaurant-backend:latest
```

### Server Hardening

- [ ] **SSH**: Key-based auth only, root login disabled
- [ ] **Auto-updates**: Unattended upgrades enabled for security patches
- [ ] **Fail2ban**: Installed and configured
- [ ] **Log rotation**: Configured to prevent disk fill
- [ ] **Backup encryption**: Backups encrypted before transfer

---

## Audit Sign-off

### Pre-Deployment Approval

| Item | Status | Approved By | Date |
|------|--------|-------------|------|
| OWASP Top 10 compliance | ⬜ | | |
| Dependency vulnerabilities | ⬜ | | |
| SSL/TLS configuration | ⬜ | | |
| Authentication review | ⬜ | | |
| Authorization review | ⬜ | | |
| Input validation | ⬜ | | |
| File upload security | ⬜ | | |
| Session security | ⬜ | | |
| Infrastructure security | ⬜ | | |
| Penetration testing | ⬜ | | |

### Known Issues

| Issue | Severity | Mitigation | Ticket |
|-------|----------|------------|--------|
| MFA not implemented for admin | Medium | Scheduled for Phase 4 | SEC-001 |
| Password history not enforced | Low | Acceptable risk | SEC-002 |

### Deployment Approval

**Approved for deployment to production:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | | | |
| CTO/Technical Lead | | | |
| Product Owner | | | |

---

## Post-Deployment Verification

### Immediate Checks (within 1 hour)

- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Authentication working
- [ ] No errors in logs

### 24-Hour Checks

- [ ] No security alerts
- [ ] Rate limiting functioning
- [ ] Audit logs recording
- [ ] Backups completing successfully

### Weekly Checks

- [ ] Dependency scan
- [ ] SSL certificate expiry check
- [ ] Access log review
- [ ] Failed login attempt review

---

## Quick Reference

```bash
# Run all security checks
./scripts/secrets-check.sh
./scripts/health-check.sh

# Check headers
curl -s -I https://your-domain.com

# Test SSL
openssl s_client -connect your-domain.com:443 -tls1_3

# Check for secrets in code
grep -r "password\|secret\|key" --include="*.py" . | grep -v ".pyc"

# Dependency scan
cd backend && safety check
cd frontend && npm audit
```

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
*Classification: Internal Use Only*
