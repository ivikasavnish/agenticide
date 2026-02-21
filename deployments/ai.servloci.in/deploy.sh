#!/bin/bash
# Deploy ai.servloci.in to servloci server
# Usage: ./deploy.sh [domain]
# Default domain: ai.servloci.in (also works with ai.devtunnel.in)

set -e

DOMAIN="${1:-ai.servloci.in}"
SERVER="root@servloci"
SITE_NAME="ai-servloci"
DEPLOY_PATH="/var/www/$SITE_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying to $DOMAIN on $SERVER..."

# Create directory on server
ssh $SERVER "mkdir -p $DEPLOY_PATH"

# Sync files
rsync -avz --delete \
    --exclude 'deploy.sh' \
    --exclude 'deploy.config.json' \
    --exclude '.DS_Store' \
    "$SCRIPT_DIR/" "$SERVER:$DEPLOY_PATH/"

# Create nginx config
ssh $SERVER "cat > /etc/nginx/sites-available/$SITE_NAME << 'NGINX'
server {
    listen 80;
    server_name $DOMAIN ai.devtunnel.in;
    root $DEPLOY_PATH;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
}
NGINX"

# Enable site
ssh $SERVER "ln -sf /etc/nginx/sites-available/$SITE_NAME /etc/nginx/sites-enabled/"

# Test nginx config
ssh $SERVER "nginx -t"

# Reload nginx
ssh $SERVER "systemctl reload nginx"

# Setup SSL if not already configured
echo "Setting up SSL certificate..."
ssh $SERVER "certbot --nginx -d $DOMAIN -d ai.devtunnel.in --non-interactive --agree-tos --email admin@servloci.in 2>/dev/null || echo 'SSL already configured or certbot not available'"

echo ""
echo "Deployment complete!"
echo "Site available at:"
echo "  - https://$DOMAIN"
echo "  - https://ai.devtunnel.in"
