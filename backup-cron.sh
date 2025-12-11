#!/bin/bash

# Cron wrapper script for database backups
# This script is designed to be called by cron every 12 hours
# Cron expression: 0 */12 * * * /path/to/backup-cron.sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Run the backup script
"$SCRIPT_DIR/backup.sh"

# Optional: Send notification on failure
if [ $? -ne 0 ]; then
    echo "Backup failed at $(date)" >> "$SCRIPT_DIR/backup-errors.log"
    # Uncomment to send email (requires mail setup):
    # echo "Database backup failed at $(date)" | mail -s "Backup Failed" admin@example.com
fi

exit 0

