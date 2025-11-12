# Database Backup & Restore Guide

This guide explains how to backup and restore your MySQL database (Amazon RDS).

## Prerequisites

- `mysqldump` and `mysql` client tools installed
- Access to your database (credentials in `.env` file or environment variables)
- For RDS: SSL certificate configured (if using SSL)

## Manual Backup

### Create a Backup

```bash
./backup.sh
```

This will create a backup file in the `./backups/` directory with a timestamp:
- Format: `backup_mob_barley_YYYYMMDD_HHMMSS.sql.gz`
- The backup is automatically compressed with gzip

You can also specify a custom output file:
```bash
./backup.sh /path/to/custom-backup.sql
```

### Restore from Backup

**⚠️ WARNING: This will overwrite your existing database!**

```bash
./restore.sh backups/backup_mob_barley_20241112_120000.sql.gz
```

The script will:
1. Ask for confirmation before proceeding
2. Decompress the backup if it's a `.gz` file
3. Restore the database

## Automated Backups with Cron

### Setup Cron Job

1. Edit your crontab:
   ```bash
   crontab -e
   ```

2. Add the following line to run backups every 12 hours:
   ```bash
   0 */12 * * * /home/macar/Documents/course-project-mob-barley/backup-cron.sh >> /home/macar/Documents/course-project-mob-barley/backup-cron.log 2>&1
   ```

   **Cron Expression:** `0 */12 * * *`
   - Runs at minute 0 of every 12th hour (00:00 and 12:00)

3. Verify the cron job is installed:
   ```bash
   crontab -l
   ```

### Cron Expression Breakdown

```
0 */12 * * *
│  │   │ │ │
│  │   │ │ └── Day of week (0-7, both 0 and 7 are Sunday)
│  │   │ └──── Month (1-12)
│  │   └────── Day of month (1-31)
│  └────────── Hour (0-23) - */12 means every 12 hours
└───────────── Minute (0-59) - 0 means at the start of the hour
```

## Environment Variables

The scripts read database connection details from:
1. `.env` file (if present)
2. Environment variables

Required variables:
- `DB_HOST` - Database hostname (e.g., your RDS endpoint)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: mob_barley)

For RDS with SSL:
- `DB_SSL=true`
- `DB_SSL_CA_PATH` - Path to SSL certificate file, OR
- `DB_SSL_CA` - SSL certificate content as environment variable

## Backup Location

- Default backup directory: `./backups/`
- Customize with: `BACKUP_DIR=/custom/path ./backup.sh`

## Testing (Safe for RDS)

Since you're using Amazon RDS, you can safely test the backup:

```bash
# 1. Create a backup
./backup.sh

# 2. Verify the backup file was created
ls -lh backups/

# 3. Test restore to a different database (if you have one)
# Or just verify the backup file is valid:
gunzip -t backups/backup_mob_barley_*.sql.gz
```

## Troubleshooting

### SSL Connection Issues

If you get SSL errors with RDS:
1. Download the RDS CA bundle: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
2. Set `DB_SSL_CA_PATH` to the path of the downloaded file
3. Or set `DB_SSL_CA` with the certificate content

### Permission Denied

Make sure the scripts are executable:
```bash
chmod +x backup.sh restore.sh backup-cron.sh
```

### Cron Job Not Running

1. Check cron logs: `grep CRON /var/log/syslog` (Linux) or check system logs
2. Verify the path in crontab is absolute and correct
3. Check the backup-cron.log file for errors

## Files

- `backup.sh` - Main backup script
- `restore.sh` - Restore script
- `backup-cron.sh` - Cron wrapper script
- `crontab.example` - Example cron configuration
- `backups/` - Directory where backups are stored (created automatically)

