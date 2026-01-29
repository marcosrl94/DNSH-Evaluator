#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup file

set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE=$1

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME=${DATABASE_NAME:-ecoinvest_dnsh_evaluator}
DB_USER=${DATABASE_USER:-postgres}
DB_HOST=${DATABASE_HOST:-localhost}

echo "⚠️  WARNING: This will overwrite the database $DB_NAME"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo "🔄 Restoring database from: $BACKUP_FILE"

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DATABASE_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
else
  PGPASSWORD="${DATABASE_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "✅ Database restored successfully"
