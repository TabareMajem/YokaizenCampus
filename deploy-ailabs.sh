#!/bin/bash
# ============================================
# Yokaizen AI Labs - Deployment Script
# ============================================
# Domain: ai.yokaizencampus.com
# Frontend: Port 7791
# Backend: Port 7792
# ============================================

set -e

echo "🚀 Starting Yokaizen AI Labs Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/yokaizen-ailabs"
BACKEND_PORT=7792
FRONTEND_PORT=7791
REPO_SOURCE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================
# Step 1: Create directories
# ============================================
echo -e "${YELLOW}📁 Creating deployment directories...${NC}"
sudo mkdir -p $DEPLOY_DIR/backend
sudo mkdir -p $DEPLOY_DIR/frontend
sudo chown -R $USER:$USER $DEPLOY_DIR

# ============================================
# Step 2: Copy Backend
# ============================================
echo -e "${YELLOW}📦 Deploying Backend...${NC}"
cp -r "$REPO_SOURCE/AI Labs FULL project/yokaizen-backend/"* $DEPLOY_DIR/backend/

# Create production .env
cp "$REPO_SOURCE/AI Labs FULL project/yokaizen-backend/.env.production" $DEPLOY_DIR/backend/.env

# Copy Firebase admin SDK
cp "$REPO_SOURCE/yokaizen-campus-firebase-adminsdk-fbsvc-0964fd16e7.json" $DEPLOY_DIR/backend/firebase-admin.json

cd $DEPLOY_DIR/backend

# Install dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
npm install --production

# Build TypeScript
echo -e "${YELLOW}🔨 Building backend...${NC}"
npm run build

# ============================================
# Step 3: Copy Frontend
# ============================================
echo -e "${YELLOW}📦 Deploying Frontend...${NC}"
cp -r "$REPO_SOURCE/AI Labs FULL project/yokaizen-ai-labs/"* $DEPLOY_DIR/frontend/

cd $DEPLOY_DIR/frontend

# Install dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
npm install

# Build for production
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# ============================================
# Step 4: Setup PM2 Processes
# ============================================
echo -e "${YELLOW}⚡ Setting up PM2 processes...${NC}"

# Stop existing processes if they exist
pm2 stop ailabs-backend 2>/dev/null || true
pm2 stop ailabs-frontend 2>/dev/null || true

# Start backend
cd $DEPLOY_DIR/backend
pm2 start dist/index.js --name "ailabs-backend" -- --port $BACKEND_PORT

# Start frontend (using vite preview for SPA)
cd $DEPLOY_DIR/frontend
pm2 start npm --name "ailabs-frontend" -- run preview -- --port $FRONTEND_PORT --host

# Save PM2 config
pm2 save

echo -e "${GREEN}✅ PM2 processes started${NC}"

# ============================================
# Step 5: Setup Nginx
# ============================================
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"

# Copy nginx config
sudo cp "$REPO_SOURCE/nginx-ailabs.conf" /etc/nginx/sites-available/ailabs.conf

# Enable site
sudo ln -sf /etc/nginx/sites-available/ailabs.conf /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# ============================================
# Step 6: SSL Certificate (if not exists)
# ============================================
if [ ! -f "/etc/letsencrypt/live/ai.yokaizencampus.com/fullchain.pem" ]; then
    echo -e "${YELLOW}🔐 Requesting SSL certificate...${NC}"
    sudo certbot certonly --nginx -d ai.yokaizencampus.com --non-interactive --agree-tos -m admin@yokaizen.com
    
    # Reload nginx to use new certificate
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ SSL certificate obtained${NC}"
else
    echo -e "${GREEN}✅ SSL certificate already exists${NC}"
fi

# ============================================
# Step 7: Health Check
# ============================================
echo -e "${YELLOW}🏥 Running health checks...${NC}"

sleep 5

# Check backend
if curl -s http://localhost:$BACKEND_PORT/api/v1/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check frontend
if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# ============================================
# Complete
# ============================================
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "URLs:"
echo "  - Frontend: https://ai.yokaizencampus.com"
echo "  - Backend API: https://ai.yokaizencampus.com/api/v1"
echo ""
echo "PM2 Commands:"
echo "  - pm2 logs ailabs-backend"
echo "  - pm2 logs ailabs-frontend"
echo "  - pm2 status"
echo ""
