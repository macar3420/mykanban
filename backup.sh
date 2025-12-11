#!/bin/bash

# Database Backup Script for Amazon RDS MySQL
# This script creates a backup of the database using mysqldump
# Usage: ./backup.sh [output_file]

set -euo pipefail

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Database connection parameters (from environment variables)
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-mob_barley}"

# Backup directory
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${1:-${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql}"

# SSL configuration for RDS
SSL_OPTS=""
if [ "${DB_SSL:-false}" = "true" ]; then
    if [ -n "${DB_SSL_CA_PATH:-}" ] && [ -f "${DB_SSL_CA_PATH}" ]; then
        SSL_OPTS="--ssl-ca=${DB_SSL_CA_PATH}"
    elif [ -n "${DB_SSL_CA:-}" ]; then
        # Write CA to temp file if provided as env var
        TEMP_CA=$(mktemp)
        echo "$DB_SSL_CA" > "$TEMP_CA"
        SSL_OPTS="--ssl-ca=${TEMP_CA}"
        trap "rm -f $TEMP_CA" EXIT
    else
        SSL_OPTS="--ssl-mode=REQUIRED"
    fi
fi

echo "Starting database backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"

# Perform the backup using mysqldump
# For RDS MySQL, we use options that don't require RELOAD privilege
# --single-transaction works with InnoDB and doesn't need table locks
# We avoid --databases flag and use single database to prevent lock attempts
mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    $SSL_OPTS \
    --single-transaction \
    --lock-tables=false \
    --flush-logs=false \
    --quick \
    --routines \
    --triggers \
    --events \
    --no-tablespaces \
    --set-gtid-purged=OFF \
    --skip-add-locks \
    --skip-lock-tables \
    "$DB_NAME" > "$BACKUP_FILE" 2>&1

# Check if backup was successful (look for actual SQL content, not just errors)
if [ -s "$BACKUP_FILE" ] && ! grep -q "Access denied" "$BACKUP_FILE" && ! grep -q "FLUSH.*TABLES.*READ LOCK" "$BACKUP_FILE"; then
    echo "Backup completed successfully"
else
    echo "Error: Backup failed. Check the output above for details."
    echo "Attempting alternative backup method..."
    # Alternative: dump without routines/triggers/events which sometimes trigger locks
    mysqldump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --user="$DB_USER" \
        --password="$DB_PASSWORD" \
        $SSL_OPTS \
        --single-transaction \
        --lock-tables=false \
        --quick \
        --no-tablespaces \
        --set-gtid-purged=OFF \
        --skip-add-locks \
        --skip-lock-tables \
        "$DB_NAME" > "$BACKUP_FILE" 2>&1

    if [ -s "$BACKUP_FILE" ] && ! grep -q "Access denied" "$BACKUP_FILE"; then
        echo "Backup completed (without routines/triggers/events)"
    else
        echo "Backup failed. The user may need RELOAD privilege or different mysqldump options."
        exit 1
    fi
fi

# Compress the backup
if command -v gzip &> /dev/null; then
    echo "Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
fi

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✓ Backup completed successfully!"
echo "  File: $BACKUP_FILE"
echo "  Size: $FILE_SIZE"

# Optional: Keep only last N backups (uncomment to enable)
# KEEP_BACKUPS=10
# ls -t ${BACKUP_DIR}/backup_${DB_NAME}_*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs rm -f

exit 0

