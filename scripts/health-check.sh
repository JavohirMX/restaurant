#!/bin/bash
#
# Health Check Script for Restaurant Management Platform
# Usage: ./scripts/health-check.sh [--json]
#
# Performs comprehensive health checks on all system components
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
JSON_OUTPUT=false
EXIT_CODE=0

# Health check results
declare -a CHECKS
declare -a STATUSES
declare -a MESSAGES

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--json]"
            echo ""
            echo "Options:"
            echo "  --json    Output results as JSON"
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
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[PASS]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[WARN]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[FAIL]${NC} $1"
    fi
}

# Add check result
add_check() {
    local name="$1"
    local status="$2"
    local message="$3"

    CHECKS+=("$name")
    STATUSES+=("$status")
    MESSAGES+=("$message")

    if [ "$status" = "PASS" ]; then
        log_success "$name: $message"
    elif [ "$status" = "WARN" ]; then
        log_warning "$name: $message"
        EXIT_CODE=1
    else
        log_error "$name: $message"
        EXIT_CODE=1
    fi
}

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if running in correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found. Please run from project root."
    exit 1
fi

log_info "Starting health check..."
log_info ""

# =============================================================================
# Container Health Checks
# =============================================================================

log_info "Checking container status..."

# Check if containers are running
CONTAINERS=("backend" "frontend" "db" "redis")
for container in "${CONTAINERS[@]}"; do
    if $DOCKER_COMPOSE ps | grep -q "${container}.*Up"; then
        add_check "Container: $container" "PASS" "Running"
    else
        add_check "Container: $container" "FAIL" "Not running"
    fi
done

log_info ""

# =============================================================================
# Backend API Health Check
# =============================================================================

log_info "Checking backend API..."

# Try to get health endpoint
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/ 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    BACKEND_RESPONSE=$(curl -s http://localhost:8000/api/health/ 2>/dev/null)
    if echo "$BACKEND_RESPONSE" | grep -q "healthy"; then
        add_check "Backend API" "PASS" "Healthy"
    else
        add_check "Backend API" "WARN" "Responding but status not healthy"
    fi
elif [ "$BACKEND_HEALTH" = "000" ]; then
    add_check "Backend API" "FAIL" "Not responding"
else
    add_check "Backend API" "FAIL" "HTTP $BACKEND_HEALTH"
fi

# Check database connectivity via backend
DB_CHECK=$(curl -s http://localhost:8000/api/health/ 2>/dev/null | grep -o '"database".*}"' || echo "")
if echo "$DB_CHECK" | grep -q '"status": "up"'; then
    add_check "Database Connection" "PASS" "Connected"
else
    add_check "Database Connection" "FAIL" "Not connected"
fi

# Check Redis connectivity via backend
REDIS_CHECK=$(curl -s http://localhost:8000/api/health/ 2>/dev/null | grep -o '"redis".*}"' || echo "")
if echo "$REDIS_CHECK" | grep -q '"status": "up"'; then
    add_check "Redis Connection" "PASS" "Connected"
else
    add_check "Redis Connection" "FAIL" "Not connected"
fi

log_info ""

# =============================================================================
# Frontend Health Check
# =============================================================================

log_info "Checking frontend..."

FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")

if [ "$FRONTEND_HEALTH" = "200" ]; then
    add_check "Frontend" "PASS" "Healthy"
elif [ "$FRONTEND_HEALTH" = "000" ]; then
    add_check "Frontend" "FAIL" "Not responding"
else
    add_check "Frontend" "FAIL" "HTTP $FRONTEND_HEALTH"
fi

log_info ""

# =============================================================================
# Database Health Check
# =============================================================================

log_info "Checking database..."

# Check PostgreSQL is accepting connections
if $DOCKER_COMPOSE exec -T db pg_isready -U restaurant > /dev/null 2>&1; then
    add_check "PostgreSQL" "PASS" "Accepting connections"
else
    add_check "PostgreSQL" "FAIL" "Not accepting connections"
fi

# Check active connections
DB_CONNECTIONS=$($DOCKER_COMPOSE exec -T db psql -U restaurant -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'restaurant';" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$DB_CONNECTIONS" -lt 80 ]; then
    add_check "DB Connections" "PASS" "$DB_CONNECTIONS active"
elif [ "$DB_CONNECTIONS" -lt 95 ]; then
    add_check "DB Connections" "WARN" "$DB_CONNECTIONS active (high)"
else
    add_check "DB Connections" "FAIL" "$DB_CONNECTIONS active (critical)"
fi

# Check database size
DB_SIZE=$($DOCKER_COMPOSE exec -T db psql -U restaurant -t -c "SELECT pg_size_pretty(pg_database_size('restaurant'));" 2>/dev/null | tr -d ' ' || echo "unknown")
add_check "DB Size" "PASS" "$DB_SIZE"

log_info ""

# =============================================================================
# Redis Health Check
# =============================================================================

log_info "Checking Redis..."

# Check Redis is responding
if $DOCKER_COMPOSE exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    add_check "Redis" "PASS" "Responding"
else
    add_check "Redis" "FAIL" "Not responding"
fi

# Check Redis memory usage
REDIS_MEMORY=$($DOCKER_COMPOSE exec -T redis redis-cli info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "unknown")
add_check "Redis Memory" "PASS" "$REDIS_MEMORY used"

log_info ""

# =============================================================================
# Disk Space Check
# =============================================================================

log_info "Checking disk space..."

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 70 ]; then
    add_check "Disk Usage" "PASS" "${DISK_USAGE}% used"
elif [ "$DISK_USAGE" -lt 85 ]; then
    add_check "Disk Usage" "WARN" "${DISK_USAGE}% used"
else
    add_check "Disk Usage" "FAIL" "${DISK_USAGE}% used"
fi

# Check Docker volume usage
DOCKER_USAGE=$(docker system df --format "{{.Size}}" 2>/dev/null | head -1 || echo "unknown")
add_check "Docker Storage" "PASS" "$DOCKER_USAGE"

log_info ""

# =============================================================================
# Memory Check
# =============================================================================

log_info "Checking memory..."

# Check system memory
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEMORY_USAGE" -lt 80 ]; then
        add_check "Memory Usage" "PASS" "${MEMORY_USAGE}% used"
    elif [ "$MEMORY_USAGE" -lt 95 ]; then
        add_check "Memory Usage" "WARN" "${MEMORY_USAGE}% used"
    else
        add_check "Memory Usage" "FAIL" "${MEMORY_USAGE}% used"
    fi
else
    add_check "Memory Usage" "WARN" "Cannot determine (free not available)"
fi

log_info ""

# =============================================================================
# SSL Certificate Check (Production Only)
# =============================================================================

log_info "Checking SSL certificate..."

# Check if SSL is configured
if [ -f ".env" ]; then
    DOMAIN=$(grep "DOMAIN=" .env | cut -d= -f2 || echo "")
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        # Check SSL certificate expiry
        SSL_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
        if [ -n "$SSL_EXPIRY" ]; then
            # Convert to epoch
            EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || echo "0")
            CURRENT_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

            if [ "$DAYS_UNTIL_EXPIRY" -gt 30 ]; then
                add_check "SSL Certificate" "PASS" "Valid for $DAYS_UNTIL_EXPIRY days"
            elif [ "$DAYS_UNTIL_EXPIRY" -gt 7 ]; then
                add_check "SSL Certificate" "WARN" "Expires in $DAYS_UNTIL_EXPIRY days"
            else
                add_check "SSL Certificate" "FAIL" "Expires in $DAYS_UNTIL_EXPIRY days"
            fi
        else
            add_check "SSL Certificate" "WARN" "Could not check expiry"
        fi
    else
        add_check "SSL Certificate" "PASS" "Local development (no SSL required)"
    fi
else
    add_check "SSL Certificate" "WARN" "No .env file found"
fi

log_info ""

# =============================================================================
# Backup Check
# =============================================================================

log_info "Checking backups..."

# Check for recent backups
if [ -d "./backups" ]; then
    LATEST_DB_BACKUP=$(find ./backups -name "*.sql.gz" -type f -mtime -1 2>/dev/null | head -1 || echo "")
    if [ -n "$LATEST_DB_BACKUP" ]; then
        BACKUP_DATE=$(stat -c %y "$LATEST_DB_BACKUP" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        add_check "Database Backup" "PASS" "Latest: $BACKUP_DATE"
    else
        add_check "Database Backup" "WARN" "No backup in last 24 hours"
    fi

    LATEST_MEDIA_BACKUP=$(find ./backups -name "*.tar.gz" -type f -mtime -1 2>/dev/null | head -1 || echo "")
    if [ -n "$LATEST_MEDIA_BACKUP" ]; then
        BACKUP_DATE=$(stat -c %y "$LATEST_MEDIA_BACKUP" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        add_check "Media Backup" "PASS" "Latest: $BACKUP_DATE"
    else
        add_check "Media Backup" "WARN" "No backup in last 24 hours"
    fi
else
    add_check "Backups" "WARN" "Backup directory not found"
fi

log_info ""

# =============================================================================
# Security Headers Check
# =============================================================================

log_info "Checking security headers..."

# Check security headers on frontend
if [ "$FRONTEND_HEALTH" = "200" ]; then
    HEADERS=$(curl -s -I http://localhost:3000 2>/dev/null)

    if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
        add_check "Header: X-Frame-Options" "PASS" "Present"
    else
        add_check "Header: X-Frame-Options" "WARN" "Missing"
    fi

    if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
        add_check "Header: X-Content-Type-Options" "PASS" "Present"
    else
        add_check "Header: X-Content-Type-Options" "WARN" "Missing"
    fi

    if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
        add_check "Header: Referrer-Policy" "PASS" "Present"
    else
        add_check "Header: Referrer-Policy" "WARN" "Missing"
    fi
fi

log_info ""

# =============================================================================
# Summary
# =============================================================================

# Count results
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

for status in "${STATUSES[@]}"; do
    case $status in
        PASS) ((PASS_COUNT++)) ;;
        WARN) ((WARN_COUNT++)) ;;
        FAIL) ((FAIL_COUNT++)) ;;
    esac
done

TOTAL_COUNT=${#CHECKS[@]}

# Output JSON if requested
if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"summary\": {"
    echo "    \"total\": $TOTAL_COUNT,"
    echo "    \"pass\": $PASS_COUNT,"
    echo "    \"warn\": $WARN_COUNT,"
    echo "    \"fail\": $FAIL_COUNT,"
    echo "    \"healthy\": $([ $FAIL_COUNT -eq 0 ] && echo "true" || echo "false")"
    echo "  },"
    echo "  \"checks\": ["

    for i in "${!CHECKS[@]}"; do
        comma=$([ $i -lt $((${#CHECKS[@]} - 1)) ] && echo "," || echo "")
        echo "    {"
        echo "      \"name\": \"${CHECKS[$i]}\","
        echo "      \"status\": \"${STATUSES[$i]}\","
        echo "      \"message\": \"${MESSAGES[$i]}\""
        echo "    }$comma"
    done

    echo "  ]"
    echo "}"
else
    echo "========================================"
    echo "           HEALTH CHECK SUMMARY"
    echo "========================================"
    echo -e "Total Checks: $TOTAL_COUNT"
    echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
    echo -e "${YELLOW}Warnings: $WARN_COUNT${NC}"
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    echo ""

    if [ $FAIL_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! System is healthy.${NC}"
    elif [ $FAIL_COUNT -eq 0 ]; then
        echo -e "${YELLOW}⚠ System is functional but has warnings.${NC}"
    else
        echo -e "${RED}✗ System has failures that need attention.${NC}"
    fi
fi

exit $EXIT_CODE
