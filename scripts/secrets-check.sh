#!/bin/bash
#
# Secrets Validation Script for Restaurant Management Platform
# Usage: ./scripts/secrets-check.sh [--strict]
#
# Validates that all required secrets are properly configured and secure
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STRICT_MODE=false
EXIT_CODE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            STRICT_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--strict]"
            echo ""
            echo "Options:"
            echo "  --strict  Enable strict mode (fail on warnings)"
            echo "  --help    Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    if [ "$STRICT_MODE" = true ]; then
        EXIT_CODE=1
    fi
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    EXIT_CODE=1
}

# Check if running in correct directory
if [ ! -f ".env.example" ]; then
    echo "Error: .env.example not found. Please run from project root."
    exit 1
fi

log_info "Starting secrets validation..."
log_info "Mode: $([ "$STRICT_MODE" = true ] && echo "STRICT" || echo "NORMAL")"
log_info ""

# =============================================================================
# Environment File Checks
# =============================================================================

log_info "Checking environment files..."

# Check .env exists
if [ -f ".env" ]; then
    log_success ".env file exists"
else
    log_error ".env file not found (copy from .env.example)"
fi

# Check .env is not committed
if [ -d ".git" ]; then
    if git check-ignore -q .env 2>/dev/null || ! git ls-files --error-unmatch .env > /dev/null 2>&1; then
        log_success ".env is not tracked by git"
    else
        log_error ".env is tracked by git (SECURITY RISK!)"
    fi
fi

# Check .env.production exists (for production deployments)
if [ -f ".env.production" ]; then
    log_success ".env.production file exists"
    if [ -d ".git" ]; then
        if git check-ignore -q .env.production 2>/dev/null || ! git ls-files --error-unmatch .env.production > /dev/null 2>&1; then
            log_success ".env.production is not tracked by git"
        else
            log_error ".env.production is tracked by git (SECURITY RISK!)"
        fi
    fi
else
    log_warning ".env.production not found (needed for production)"
fi

log_info ""

# =============================================================================
# Secret Key Validation
# =============================================================================

log_info "Validating Django SECRET_KEY..."

if [ -f ".env" ]; then
    SECRET_KEY=$(grep "^SECRET_KEY=" .env | cut -d= -f2- || echo "")

    if [ -z "$SECRET_KEY" ]; then
        log_error "SECRET_KEY is not set"
    elif [ "$SECRET_KEY" = "your-secret-key-here-min-50-chars-long-for-security" ]; then
        log_error "SECRET_KEY is using default value"
    elif [ "$SECRET_KEY" = "django-insecure-dev-only-change-in-production" ]; then
        log_error "SECRET_KEY is using development fallback"
    elif [ ${#SECRET_KEY} -lt 50 ]; then
        log_warning "SECRET_KEY is only ${#SECRET_KEY} characters (recommended: 50+)"
    else
        log_success "SECRET_KEY is set and meets length requirements (${#SECRET_KEY} chars)"
    fi

    # Check for common weak patterns
    if echo "$SECRET_KEY" | grep -qi "secret\|password\|key\|admin\|123\|test\|demo"; then
        log_warning "SECRET_KEY may contain common weak patterns"
    fi
else
    log_error "Cannot validate SECRET_KEY (.env not found)"
fi

log_info ""

# =============================================================================
# JWT Secret Validation
# =============================================================================

log_info "Validating JWT_SECRET..."

if [ -f ".env" ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d= -f2- || echo "")
    SECRET_KEY=$(grep "^SECRET_KEY=" .env | cut -d= -f2- || echo "")

    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is not set"
    elif [ "$JWT_SECRET" = "your-jwt-secret-different-from-django-secret-key" ]; then
        log_error "JWT_SECRET is using default value"
    elif [ ${#JWT_SECRET} -lt 32 ]; then
        log_warning "JWT_SECRET is only ${#JWT_SECRET} characters (recommended: 32+)"
    else
        log_success "JWT_SECRET is set and meets length requirements"
    fi

    # Check JWT_SECRET differs from SECRET_KEY
    if [ -n "$JWT_SECRET" ] && [ -n "$SECRET_KEY" ] && [ "$JWT_SECRET" = "$SECRET_KEY" ]; then
        log_error "JWT_SECRET is identical to SECRET_KEY (security risk)"
    elif [ -n "$JWT_SECRET" ] && [ -n "$SECRET_KEY" ]; then
        log_success "JWT_SECRET differs from SECRET_KEY"
    fi
else
    log_error "Cannot validate JWT_SECRET (.env not found)"
fi

log_info ""

# =============================================================================
# Database Password Validation
# =============================================================================

log_info "Validating database credentials..."

if [ -f ".env" ]; then
    DB_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env | cut -d= -f2- || echo "")

    if [ -z "$DB_PASSWORD" ]; then
        log_error "POSTGRES_PASSWORD is not set"
    elif [ "$DB_PASSWORD" = "change_me_in_production_use_strong_password" ]; then
        log_error "POSTGRES_PASSWORD is using default value"
    elif [ "$DB_PASSWORD" = "restaurant_dev" ]; then
        log_warning "POSTGRES_PASSWORD is using development value"
    elif [ ${#DB_PASSWORD} -lt 12 ]; then
        log_warning "POSTGRES_PASSWORD is only ${#DB_PASSWORD} characters (recommended: 12+)"
    else
        log_success "POSTGRES_PASSWORD is set and appears strong"
    fi

    # Check for common weak passwords
    if echo "$DB_PASSWORD" | grep -qi "^postgres$\|^password\|^123\|^admin"; then
        log_error "POSTGRES_PASSWORD appears to be a common weak password"
    fi
else
    log_error "Cannot validate POSTGRES_PASSWORD (.env not found)"
fi

log_info ""

# =============================================================================
# Email Credentials Validation
# =============================================================================

log_info "Validating email configuration..."

if [ -f ".env" ]; then
    EMAIL_BACKEND_TYPE=$(grep "^EMAIL_BACKEND_TYPE=" .env | cut -d= -f2 || echo "console")

    if [ "$EMAIL_BACKEND_TYPE" = "smtp" ]; then
        EMAIL_HOST_PASSWORD=$(grep "^EMAIL_HOST_PASSWORD=" .env | cut -d= -f2- || echo "")

        if [ -z "$EMAIL_HOST_PASSWORD" ]; then
            log_warning "EMAIL_HOST_PASSWORD is not set (SMTP may fail)"
        elif [ "$EMAIL_HOST_PASSWORD" = "your-app-password-or-smtp-password" ]; then
            log_error "EMAIL_HOST_PASSWORD is using default value"
        else
            log_success "EMAIL_HOST_PASSWORD is set"
        fi
    else
        log_info "Email backend is set to '$EMAIL_BACKEND_TYPE' (SMTP not required)"
    fi
else
    log_error "Cannot validate email configuration (.env not found)"
fi

log_info ""

# =============================================================================
# API Keys and External Services
# =============================================================================

log_info "Checking external service credentials..."

if [ -f ".env" ]; then
    # Check for Sentry DSN (optional but recommended for production)
    SENTRY_DSN=$(grep "^SENTRY_DSN=" .env | cut -d= -f2- || echo "")
    if [ -z "$SENTRY_DSN" ]; then
        log_warning "SENTRY_DSN not set (error tracking disabled)"
    else
        log_success "SENTRY_DSN is configured"
    fi

    # Check for AWS/backup credentials
    AWS_ACCESS_KEY=$(grep "^AWS_ACCESS_KEY_ID=" .env | cut -d= -f2 || echo "")
    if [ -n "$AWS_ACCESS_KEY" ]; then
        log_success "AWS credentials are configured"
    fi
fi

log_info ""

# =============================================================================
# Secret Scanning
# =============================================================================

log_info "Scanning for potential secrets in codebase..."

# Patterns to search for
PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "api_key\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY"
    "AKIA[0-9A-Z]{16}"  # AWS Access Key ID pattern
    "ghp_[a-zA-Z0-9]{36}"  # GitHub Personal Access Token
)

FOUND_SECRETS=0
for pattern in "${PATTERNS[@]}"; do
    # Search in Python files (excluding migrations, tests, and virtual env)
    MATCHES=$(find ./backend -name "*.py" -type f \
        ! -path "*/migrations/*" \
        ! -path "*/tests/*" \
        ! -path "*/.venv/*" \
        ! -path "*/venv/*" \
        ! -path "*/__pycache__/*" \
        -exec grep -l -E "$pattern" {} \; 2>/dev/null | head -5 || true)

    if [ -n "$MATCHES" ]; then
        log_warning "Potential secret pattern found in:"
        echo "$MATCHES" | while read -r file; do
            echo "  - $file"
        done
        FOUND_SECRETS=$((FOUND_SECRETS + 1))
    fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
    log_success "No obvious secrets found in source code"
fi

log_info ""

# =============================================================================
# SSL Certificate Validation
# =============================================================================

log_info "Checking SSL certificate configuration..."

if [ -f ".env" ]; then
    DOMAIN=$(grep "^DOMAIN=" .env | cut -d= -f2 || echo "")

    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "your-domain.com" ] && [ "$DOMAIN" != "localhost" ]; then
        # Check if SSL certificate files exist
        if [ -f "./nginx/ssl/cert.pem" ] || [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            log_success "SSL certificate files found"

            # Check certificate validity
            if command -v openssl &> /dev/null; then
                CERT_FILE="./nginx/ssl/cert.pem"
                if [ ! -f "$CERT_FILE" ]; then
                    CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
                fi

                if [ -f "$CERT_FILE" ]; then
                    # Check expiry
                    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2 || echo "")
                    if [ -n "$EXPIRY" ]; then
                        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
                        CURRENT_EPOCH=$(date +%s)
                        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

                        if [ "$DAYS_UNTIL_EXPIRY" -gt 30 ]; then
                            log_success "SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
                        elif [ "$DAYS_UNTIL_EXPIRY" -gt 0 ]; then
                            log_warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
                        else
                            log_error "SSL certificate has expired"
                        fi
                    fi
                fi
            fi
        else
            log_warning "SSL certificate files not found"
        fi
    else
        log_info "Domain not configured or using localhost (SSL check skipped)"
    fi
fi

log_info ""

# =============================================================================
# File Permissions Check
# =============================================================================

log_info "Checking file permissions..."

# Check .env file permissions
if [ -f ".env" ]; then
    ENV_PERMS=$(stat -c %a .env 2>/dev/null || stat -f %Lp .env 2>/dev/null || echo "unknown")
    if [ "$ENV_PERMS" != "unknown" ]; then
        # Check if readable by others
        if [ "$ENV_PERMS" -le 600 ]; then
            log_success ".env has secure permissions ($ENV_PERMS)"
        else
            log_warning ".env permissions are $ENV_PERMS (should be 600 or less)"
            log_info "Run: chmod 600 .env"
        fi
    fi
fi

# Check for world-readable files with secrets
if [ -d "./backend" ]; then
    WORLD_READABLE=$(find ./backend -type f -perm -004 \( -name "*.pem" -o -name "*.key" -o -name "*.p12" \) \
        ! -path "*/.venv/*" \
        ! -path "*/venv/*" \
        2>/dev/null || true)
    if [ -n "$WORLD_READABLE" ]; then
        log_warning "World-readable key files found:"
        echo "$WORLD_READABLE"
    fi
fi

log_info ""

# =============================================================================
# Docker Secrets Check
# =============================================================================

log_info "Checking Docker secrets configuration..."

# Check if secrets are passed via environment or files
if [ -f "docker-compose.yml" ]; then
    # Check for hardcoded secrets in docker-compose
    HARDCODED=$(grep -E "(PASSWORD|SECRET|KEY)=" docker-compose.yml | grep -v "\${" || true)
    if [ -n "$HARDCODED" ]; then
        log_warning "Potential hardcoded secrets in docker-compose.yml:"
        echo "$HARDCODED"
    else
        log_success "No hardcoded secrets found in docker-compose.yml"
    fi
fi

log_info ""

# =============================================================================
# Summary
# =============================================================================

echo "========================================"
echo "        SECRETS VALIDATION SUMMARY"
echo "========================================"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All secrets validation checks passed!${NC}"
    echo ""
    echo "Your secrets configuration appears secure."
else
    if [ "$STRICT_MODE" = true ]; then
        echo -e "${RED}✗ Secrets validation failed (strict mode)${NC}"
    else
        echo -e "${YELLOW}⚠ Secrets validation completed with issues${NC}"
    fi
    echo ""
    echo "Please review the warnings/errors above."
fi

echo ""
echo "Recommendations:"
echo "  1. Ensure all secrets are unique and randomly generated"
echo "  2. Rotate secrets regularly (see docs/OPS/SECURITY.md)"
echo "  3. Never commit .env files to version control"
echo "  4. Use strong passwords (12+ characters, mixed case, numbers, symbols)"
echo "  5. Enable 2FA for all service accounts where possible"
echo ""

exit $EXIT_CODE
