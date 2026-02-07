#!/bin/bash
#
# Deployment script for Restaurant Management Platform
# Usage: ./deploy.sh [environment] [version]
#   environment: local|staging|production (default: local)
#   version: git tag or branch (default: latest)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-local}
VERSION=${2:-latest}
COMPOSE_FILE="docker-compose.yml"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Restaurant Management Platform - Deployment Script

Usage: ./deploy.sh [environment] [version]

Environments:
  local       Deploy locally for development (default)
  staging     Deploy to staging environment
  production  Deploy to production environment

Version:
  latest      Use latest images (default)
  v1.0.0      Use specific version tag

Examples:
  ./deploy.sh                    # Deploy locally with latest images
  ./deploy.sh staging            # Deploy to staging
  ./deploy.sh production v1.0.0  # Deploy v1.0.0 to production

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Determine docker compose command
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi

    log_success "Prerequisites check passed"
}

# Parse environment file safely (avoids executing malicious content)
parse_env_file() {
    local env_file="$1"
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        # Only export valid KEY=value lines (alphanumeric key, no special chars)
        if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*= ]]; then
            export "$line"
        else
            log_warning "Skipping invalid line in $env_file: $line"
        fi
    done < "$env_file"
}

# Load environment variables
load_env() {
    log_info "Loading environment variables..."

    if [ "$ENVIRONMENT" == "local" ]; then
        if [ -f ".env" ]; then
            parse_env_file ".env"
            log_success "Loaded .env file"
        else
            log_warning ".env file not found. Using default values."
            if [ -f ".env.example" ]; then
                log_info "Copy .env.example to .env and customize it."
            fi
        fi
    elif [ "$ENVIRONMENT" == "staging" ]; then
        if [ -f ".env.staging" ]; then
            parse_env_file ".env.staging"
            log_success "Loaded .env.staging file"
        else
            log_error ".env.staging file not found!"
            exit 1
        fi
    elif [ "$ENVIRONMENT" == "production" ]; then
        if [ -f ".env.production" ]; then
            parse_env_file ".env.production"
            log_success "Loaded .env.production file"
        else
            log_error ".env.production file not found!"
            exit 1
        fi
    fi
}

# Build images
build_images() {
    log_info "Building Docker images..."

    if [ "$ENVIRONMENT" == "local" ]; then
        $DOCKER_COMPOSE -f $COMPOSE_FILE build
    else
        # For staging/production, pull pre-built images
        export IMAGE_TAG=$VERSION
        $DOCKER_COMPOSE -f $COMPOSE_FILE pull
    fi

    log_success "Images ready"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm backend python manage.py migrate --noinput

    log_success "Migrations completed"
}

# Collect static files
collect_static() {
    log_info "Collecting static files..."

    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm backend python manage.py collectstatic --noinput --clear

    log_success "Static files collected"
}

# Start services
start_services() {
    log_info "Starting services..."

    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d --remove-orphans

    log_success "Services started"
}

# Wait for services to be healthy
wait_for_health() {
    log_info "Waiting for services to be healthy..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost/health/ > /dev/null 2>&1; then
            log_success "All services are healthy!"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: Services not ready yet, waiting..."
        sleep 5
        attempt=$((attempt + 1))
    done

    log_error "Services failed to become healthy within timeout"
    return 1
}

# Display service status
show_status() {
    log_info "Service Status:"
    echo ""
    $DOCKER_COMPOSE -f $COMPOSE_FILE ps
    echo ""
    log_info "Logs:"
    echo "  Backend:  $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f backend"
    echo "  Frontend: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f frontend"
    echo "  Database: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f db"
    echo ""
}

# Cleanup old resources
cleanup() {
    log_info "Cleaning up old resources..."

    # Remove dangling images
    docker image prune -f > /dev/null 2>&1 || true

    # Remove unused volumes (optional, be careful)
    # docker volume prune -f > /dev/null 2>&1 || true

    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    echo ""

    # Set compose file based on environment
    if [ "$ENVIRONMENT" == "local" ]; then
        COMPOSE_FILE="docker-compose.yml"
    else
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    check_prerequisites
    load_env
    build_images

    # For production, create backup first
    if [ "$ENVIRONMENT" == "production" ]; then
        log_info "Creating database backup..."
        ./scripts/backup.sh || log_warning "Backup failed, continuing anyway..."
    fi

    run_migrations
    collect_static
    start_services

    # Wait for health check on local/staging
    if [ "$ENVIRONMENT" != "production" ]; then
        wait_for_health || exit 1
    fi

    cleanup
    show_status

    log_success "Deployment completed successfully!"

    # Display URLs
    echo ""
    log_info "Application URLs:"
    if [ "$ENVIRONMENT" == "local" ]; then
        echo "  Frontend: http://localhost:3000"
        echo "  Backend API: http://localhost:8000"
        echo "  Admin: http://localhost:8000/admin/"
        echo "  Health Check: http://localhost:8000/health/"
    else
        echo "  Application: https://$DOMAIN"
        echo "  Health Check: https://$DOMAIN/health/"
    fi
}

# Handle script arguments
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
esac

# Run deployment
deploy
