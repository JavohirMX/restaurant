#!/bin/bash
#
# Backup script for Restaurant Management Platform
# Usage: ./backup.sh [type]
#   type: database|media|all (default: all)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_TYPE=${1:-all}
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

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
Restaurant Management Platform - Backup Script

Usage: ./backup.sh [type]

Types:
  database    Backup only the database
  media       Backup only media files
  all         Backup both database and media (default)

Environment Variables:
  BACKUP_DIR      Backup directory (default: ./backups)
  RETENTION_DAYS  Number of days to keep backups (default: 30)

Examples:
  ./backup.sh              # Backup everything
  ./backup.sh database     # Backup only database
  ./backup.sh media        # Backup only media files

EOF
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Backup database
backup_database() {
    log_info "Starting database backup..."

    local backup_file="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"

    # Check if database container is running
    if ! $DOCKER_COMPOSE ps | grep -q "db"; then
        log_error "Database container is not running!"
        return 1
    fi

    # Create database dump
    log_info "Creating database dump..."
    $DOCKER_COMPOSE exec -T db pg_dump \
        -U "${POSTGRES_USER:?POSTGRES_USER must be set}" \
        -d "${POSTGRES_DB:?POSTGRES_DB must be set}" \
        --clean \
        --if-exists \
        --verbose > "$backup_file"

    # Compress the backup
    log_info "Compressing backup..."
    gzip -f "$backup_file"

    # Verify backup
    if [ -f "$compressed_file" ]; then
        local size=$(du -h "$compressed_file" | cut -f1)
        log_success "Database backup completed: $compressed_file ($size)"
    else
        log_error "Database backup failed!"
        return 1
    fi
}

# Backup media files
backup_media() {
    log_info "Starting media files backup..."

    local backup_file="$BACKUP_DIR/media_backup_$TIMESTAMP.tar.gz"

    # Check if media directory exists
    if [ ! -d "./backend/media" ]; then
        log_warning "Media directory not found at ./backend/media"
        return 0
    fi

    # Create tar archive
    log_info "Creating media archive..."
    tar -czf "$backup_file" -C ./backend media/

    # Verify backup
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Media backup completed: $backup_file ($size)"
    else
        log_error "Media backup failed!"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0

    # Cleanup database backups
    if [ -d "$BACKUP_DIR" ]; then
        deleted_count=$(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS | wc -l)
        find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

        # Cleanup media backups
        deleted_count=$((deleted_count + $(find "$BACKUP_DIR" -name "media_backup_*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)))
        find "$BACKUP_DIR" -name "media_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    fi

    if [ $deleted_count -gt 0 ]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log_info "No old backups to delete"
    fi
}

# List available backups
list_backups() {
    log_info "Available backups:"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
        echo "Database backups:"
        ls -lh "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null || echo "  None"
        echo ""
        echo "Media backups:"
        ls -lh "$BACKUP_DIR"/media_backup_*.tar.gz 2>/dev/null || echo "  None"
    else
        echo "No backup directory found."
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        log_error "Please specify a backup file to restore"
        list_backups
        return 1
    fi

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_warning "This will overwrite the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        return 0
    fi

    log_info "Restoring database from $backup_file..."

    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        log_info "Decompressing backup..."
        gunzip -c "$backup_file" | $DOCKER_COMPOSE exec -T db psql \
            -U "${POSTGRES_USER:?POSTGRES_USER must be set}" \
            -d "${POSTGRES_DB:?POSTGRES_DB must be set}"
    else
        $DOCKER_COMPOSE exec -T db psql \
            -U "${POSTGRES_USER:?POSTGRES_USER must be set}" \
            -d "${POSTGRES_DB:?POSTGRES_DB must be set}" < "$backup_file"
    fi

    log_success "Database restore completed!"
}

# Main function
main() {
    # Load environment variables
    if [ -f ".env" ]; then
        source .env
    fi

    create_backup_dir

    case "$BACKUP_TYPE" in
        database)
            backup_database
            ;;
        media)
            backup_media
            ;;
        all)
            backup_database
            backup_media
            ;;
        list)
            list_backups
            exit 0
            ;;
        restore)
            restore_database "$2"
            exit 0
            ;;
        *)
            log_error "Unknown backup type: $BACKUP_TYPE"
            show_help
            exit 1
            ;;
    esac

    cleanup_old_backups

    echo ""
    log_success "Backup operation completed!"
    echo ""
    log_info "Backup location: $BACKUP_DIR"
    log_info "To list backups: ./backup.sh list"
    log_info "To restore: ./backup.sh restore <backup_file>"
}

# Handle script arguments
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
esac

# Run main function
main
