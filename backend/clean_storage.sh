#!/bin/bash

# --- JROUTE MAINTENANCE SCRIPT ---
# Usage: Run from project root via Cron
# 0 3 * * * cd /path/to/jroute && ./backend/clean_storage.sh

SHARED_DIR="./backend/shared_files"
AGE_LIMIT_DAYS=7
LOG_FILE="./backend/maintenance.log"

# Ensure Log exists
touch "$LOG_FILE"

echo "[$(date)] STARTING CLEANUP TASK" >> "$LOG_FILE"

# Check if directory exists
if [ ! -d "$SHARED_DIR" ]; then
    echo "[$(date)] ERROR: Shared directory not found." >> "$LOG_FILE"
    exit 1
fi

# Find and delete files older than 7 days
# -mtime +7 means 7*24 hours or older
DELETED_LIST=$(find "$SHARED_DIR" -type f -mtime +"$AGE_LIMIT_DAYS" -print -delete)

if [ -z "$DELETED_LIST" ]; then
    echo "[$(date)] No files older than $AGE_LIMIT_DAYS days found." >> "$LOG_FILE"
else
    COUNT=$(echo "$DELETED_LIST" | wc -l)
    echo "[$(date)] CLEANUP COMPLETE. Deleted $COUNT files." >> "$LOG_FILE"
    echo "$DELETED_LIST" >> "$LOG_FILE"
fi

echo "------------------------------------------------" >> "$LOG_FILE"