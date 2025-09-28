#!/bin/bash

# Health check script
API_URL="http://localhost:3000/api/health"
MAX_RETRIES=5
RETRY_INTERVAL=10

check_health() {
    local url=$1
    local max_retries=$2
    local retry_interval=$3
    
    for i in $(seq 1 $max_retries); do
        if curl -f -s $url > /dev/null; then
            echo "Health check passed"
            return 0
        fi
        echo "Health check failed, retrying in $retry_interval seconds... ($i/$max_retries)"
        sleep $retry_interval
    done
    
    echo "Health check failed after $max_retries attempts"
    return 1
}

# Check API health
check_health $API_URL $MAX_RETRIES $RETRY_INTERVAL
