#!/bin/bash

# Backup script
BACKUP_DIR="/opt/kaleem/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# Create backup directory
mkdir -p $BACKUP_PATH

# Backup MongoDB
docker exec kaleem-mongodb mongodump --out /backup
docker cp kaleem-mongodb:/backup $BACKUP_PATH/mongodb

# Backup Redis
docker exec kaleem-redis redis-cli BGSAVE
docker cp kaleem-redis:/data/dump.rdb $BACKUP_PATH/redis/

# Backup Qdrant
docker cp kaleem-qdrant:/qdrant/storage $BACKUP_PATH/qdrant/

# Backup MinIO
docker cp kaleem-minio:/data $BACKUP_PATH/minio/

# Compress backup
tar -czf $BACKUP_PATH.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_PATH

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_PATH.tar.gz"
