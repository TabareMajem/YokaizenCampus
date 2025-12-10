#!/bin/bash
# ============================================
# Yokaizen Campus Deployment Script
# ============================================
# This script deploys both backend and frontend
# to the Hostinger VPS
# ============================================

set -e

# Configuration
APP_NAME="yokaizen-campus"
APP_DIR="/var/www/${APP_NAME}"
BACKEND_PORT=7789
FRONTEND_PORT=7787
DOMAIN="campus.yokaizen.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        🎓 Yokaizen Campus Deployment Script                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Creating application directory...${NC}"
    mkdir -p "$APP_DIR"
fi

# ============================================
# Backend Deployment
# ============================================
echo -e "${GREEN}Deploying Backend...${NC}"
cd "${APP_DIR}/backend"

# Install dependencies
echo "Installing backend dependencies..."
npm install --production

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push database schema
echo "Pushing database schema..."
npx prisma db push --accept-data-loss

# Seed database (optional - skip if data exists)
# echo "Seeding database..."
# npm run db:seed

# Build TypeScript
echo "Building backend..."
npm run build

# Start/Restart with PM2
echo "Starting backend with PM2..."
pm2 delete ${APP_NAME}-backend 2>/dev/null || true
pm2 start dist/index.js --name ${APP_NAME}-backend --env production

# ============================================
# Frontend Deployment
# ============================================
echo -e "${GREEN}Deploying Frontend...${NC}"
cd "${APP_DIR}/frontend"

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build for production
echo "Building frontend..."
npm run build

# Serve with PM2
echo "Starting frontend with PM2..."
pm2 delete ${APP_NAME}-frontend 2>/dev/null || true
pm2 serve dist ${FRONTEND_PORT} --name ${APP_NAME}-frontend --spa

# ============================================
# Save PM2 configuration
# ============================================
echo "Saving PM2 configuration..."
pm2 save

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               ✅ Deployment Complete!                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:${BACKEND_PORT}                          ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:${FRONTEND_PORT}                          ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  Don't forget to configure Nginx reverse proxy!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
