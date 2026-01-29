#!/bin/bash

# Database Backup Script
# Backs up PostgreSQL database to S3 or local storage

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME=${DATABASE_NAME:-ecoinvest_dnsh_evaluator}
DB_USER=${DATABASE_USER:-postgres}
DB_HOST=${DATABASE_HOST:-localhost}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup of database: $DB_NAME"

# Create backup
PGPASSWORD="${DATABASE_PASSWORD}" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup created: $BACKUP_FILE"

# Upload to S3 if configured
if [ -n "$AWS_S3_BACKUP_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "📤 Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/backups/"
  echo "✅ Backup uploaded to S3"
fi

# Keep only last 7 days of backups locally
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed successfully"
