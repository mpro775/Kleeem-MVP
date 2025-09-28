#!/bin/bash

# Configuration
APP_NAME="kaleem"
CURRENT_VERSION=$(docker-compose -f docker-compose.prod.yml ps -q api | head -1)
NEW_VERSION="latest"
BACKUP_DIR="/opt/kaleem/backups"
LOG_FILE="/var/log/kaleem/deploy.log"

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

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error_exit "Docker is not running"
    fi
    
    # Check if required files exist
    if [ ! -f "docker-compose.prod.yml" ]; then
        error_exit "docker-compose.prod.yml not found"
    fi
    
    # Check if .env.prod exists
    if [ ! -f ".env.prod" ]; then
        error_exit ".env.prod not found"
    fi
    
    # Check disk space
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        error_exit "Disk usage is too high: ${DISK_USAGE}%"
    fi
    
    log "Pre-deployment checks passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    # Create backup directory
    mkdir -p $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    docker exec kaleem-mongodb mongodump --out /backup
    docker cp kaleem-mongodb:/backup $BACKUP_PATH/mongodb
    
    # Backup Redis
    docker exec kaleem-redis redis-cli BGSAVE
    docker cp kaleem-redis:/data/dump.rdb $BACKUP_PATH/redis/
    
    # Backup Qdrant
    docker cp kaleem-qdrant:/qdrant/storage $BACKUP_PATH/qdrant/
    
    # Backup MinIO
    docker cp kaleem-minio:/data $BACKUP_PATH/minio/
    
    log "Backup completed: $BACKUP_PATH"
}

# Pull new images
pull_new_images() {
    log "Pulling new images..."
    
    # Pull API image
    docker pull $APP_NAME/api:$NEW_VERSION || error_exit "Failed to pull API image"
    
    # Pull other images
    docker-compose -f docker-compose.prod.yml pull || error_exit "Failed to pull images"
    
    log "New images pulled successfully"
}

# Deploy new version
deploy_new_version() {
    log "Deploying new version..."
    
    # Update environment variables
    export DOCKER_IMAGE_TAG=$NEW_VERSION
    
    # Start new containers
    docker-compose -f docker-compose.prod.yml up -d --no-deps api || error_exit "Failed to start new API"
    
    # Wait for health check
    log "Waiting for new API to be healthy..."
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            log "New API is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            error_exit "New API failed health check"
        fi
        sleep 10
    done
    
    # Update other services
    docker-compose -f docker-compose.prod.yml up -d --no-deps workers
    docker-compose -f docker-compose.prod.yml up -d --no-deps n8n
    
    log "New version deployed successfully"
}

# Update load balancer
update_load_balancer() {
    log "Updating load balancer configuration..."
    
    # Update Nginx upstream configuration
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Test Nginx configuration
    sudo nginx -t || error_exit "Nginx configuration test failed"
    
    # Reload Nginx
    sudo systemctl reload nginx || error_exit "Failed to reload Nginx"
    
    log "Load balancer updated successfully"
}

# Cleanup old containers
cleanup_old_containers() {
    log "Cleaning up old containers..."
    
    # Remove old API containers
    docker container prune -f
    
    # Remove old images
    docker image prune -f
    
    log "Cleanup completed"
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."
    
    # Stop new containers
    docker-compose -f docker-compose.prod.yml down
    
    # Restore from backup
    # This would need to be implemented based on your backup strategy
    
    log "Rollback completed"
}

# Main deployment function
main() {
    log "Starting deployment process..."
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Backup current deployment
    backup_current
    
    # Pull new images
    pull_new_images
    
    # Deploy new version
    deploy_new_version
    
    # Update load balancer
    update_load_balancer
    
    # Cleanup old containers
    cleanup_old_containers
    
    log "Deployment completed successfully"
}

# Run main function
main "$@"
