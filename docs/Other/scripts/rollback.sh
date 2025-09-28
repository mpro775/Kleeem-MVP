#!/bin/bash

# Rollback script
BACKUP_DIR="/opt/kaleem/backups"
LATEST_BACKUP=$(ls -t $BACKUP_DIR | head -1)
LOG_FILE="/var/log/kaleem/rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

rollback_database() {
    log "Rolling back database..."
    
    # Stop current containers
    docker-compose -f docker-compose.prod.yml down
    
    # Restore MongoDB
    docker run --rm -v kaleem_mongodb_data:/data -v $BACKUP_DIR/$LATEST_BACKUP/mongodb:/backup mongo:5 mongorestore --drop /backup
    
    # Restore Redis
    docker run --rm -v kaleem_redis_data:/data -v $BACKUP_DIR/$LATEST_BACKUP/redis:/backup redis:6-alpine cp /backup/dump.rdb /data/
    
    # Restore Qdrant
    docker run --rm -v kaleem_qdrant_data:/data -v $BACKUP_DIR/$LATEST_BACKUP/qdrant:/backup qdrant/qdrant:latest cp -r /backup /data/
    
    # Restore MinIO
    docker run --rm -v kaleem_minio_data:/data -v $BACKUP_DIR/$LATEST_BACKUP/minio:/backup minio/minio:latest cp -r /backup /data/
    
    log "Database rollback completed"
}

rollback_application() {
    log "Rolling back application..."
    
    # Get previous version
    PREVIOUS_VERSION=$(docker images --format "table {{.Tag}}" | grep -v latest | head -1)
    
    # Update docker-compose.prod.yml with previous version
    sed -i "s/image: $APP_NAME\/api:.*/image: $APP_NAME\/api:$PREVIOUS_VERSION/" docker-compose.prod.yml
    
    # Start previous version
    docker-compose -f docker-compose.prod.yml up -d
    
    log "Application rollback completed"
}

# Main rollback function
main() {
    log "Starting rollback process..."
    
    rollback_database
    rollback_application
    
    log "Rollback completed successfully"
}

main "$@"
