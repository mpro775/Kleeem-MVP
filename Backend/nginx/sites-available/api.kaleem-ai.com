# /etc/nginx/sites-available/api.kaleem-ai.com
# ✅ E2: إعداد Nginx موحّد لـ API مع WebSocket

# Upstream backend servers
upstream backend_servers {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # يمكن إضافة خوادم أخرى للتوازن
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=30r/s;

# SSL redirect (HTTP to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name api.kaleem-ai.com;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.kaleem-ai.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.kaleem-ai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kaleem-ai.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/api.kaleem-ai.com/chain.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security Headers (additional to helmet)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    
    # Request ID generation
    set $request_id $request_id;
    if ($request_id = "") {
        set $request_id $pid-$msec-$remote_addr-$request_length;
    }
    
    # Logging
    access_log /var/log/nginx/api.kaleem-ai.com.access.log combined;
    error_log /var/log/nginx/api.kaleem-ai.com.error.log warn;
    
    # General settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # ✅ E2: WebSocket Location - يجب أن يكون قبل location /api/
    include /etc/nginx/conf.d/websocket.conf;
    
    # Authentication endpoints with stricter rate limiting
    location ^~ /api/auth {
        limit_req zone=auth_limit burst=5 nodelay;
        limit_req_status 429;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
        
        # Timeouts for auth
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
        proxy_connect_timeout 10s;
    }
    
    # Webhooks with specific rate limiting
    location ^~ /api/webhooks {
        limit_req zone=webhook_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
        
        # Preserve original headers for webhook signatures
        proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
        proxy_set_header X-Telegram-Bot-Api-Secret-Token $http_x_telegram_bot_api_secret_token;
        proxy_set_header X-Evolution-ApiKey $http_x_evolution_apikey;
        proxy_set_header ApiKey $http_apikey;
        
        # Webhook timeouts
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 15s;
    }
    
    # API Documentation (protected in production)
    location ^~ /api/docs {
        # Additional security for docs
        add_header X-Robots-Tag "noindex, nofollow" always;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }
    
    # Health check endpoint (no rate limiting)
    location = /api/health {
        access_log off; # Don't log health checks
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
        
        # Quick timeouts for health checks
        proxy_read_timeout 5s;
        proxy_send_timeout 5s;
        proxy_connect_timeout 3s;
    }
    
    # Metrics endpoint (no rate limiting, access control)
    location = /metrics {
        access_log off;
        
        # Restrict access to monitoring systems only
        allow 10.0.0.0/8;     # Private networks
        allow 172.16.0.0/12;  # Private networks
        allow 192.168.0.0/16; # Private networks
        deny all;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # General API endpoints
    location ^~ /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
        
        # Standard timeouts
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 10s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Static files (uploads)
    location ^~ /uploads/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff always;
        
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Default location (404 for undefined routes)
    location / {
        return 404 '{"success": false, "message": "API endpoint not found", "code": "NOT_FOUND"}';
        add_header Content-Type application/json always;
    }
    
    # Error pages
    error_page 404 = @not_found;
    error_page 429 = @rate_limited;
    error_page 500 502 503 504 = @server_error;
    
    location @not_found {
        return 404 '{"success": false, "message": "Resource not found", "code": "NOT_FOUND"}';
        add_header Content-Type application/json always;
    }
    
    location @rate_limited {
        return 429 '{"success": false, "message": "Rate limit exceeded", "code": "RATE_LIMIT_EXCEEDED"}';
        add_header Content-Type application/json always;
    }
    
    location @server_error {
        return 500 '{"success": false, "message": "Internal server error", "code": "SERVER_ERROR"}';
        add_header Content-Type application/json always;
    }
}
