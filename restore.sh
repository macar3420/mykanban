#!/bin/bash

# Database Restore Script for Amazon RDS MySQL
# This script restores a database backup using mysql client
# Usage: ./restore.sh <backup_file.sql>

set -euo pipefail

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Error: Backup file required"
    echo "Usage: $0 <backup_file.sql> [backup_file.sql.gz]"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

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

echo "Starting database restore..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"

# Check if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    DECOMPRESSED_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
    trap "rm -f $DECOMPRESSED_FILE" EXIT
    INPUT_FILE="$DECOMPRESSED_FILE"
else
    INPUT_FILE="$BACKUP_FILE"
fi

# Confirm before proceeding
read -p "This will overwrite the existing database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Perform the restore using mysql client
mysql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    $SSL_OPTS < "$INPUT_FILE"

echo "✓ Restore completed successfully!"

exit 0

