#!/bin/bash

# VPS Configuration
VPS_USER="root"
VPS_IP="62.72.56.216"
VPS_HOST="$VPS_USER@$VPS_IP"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Yokaizen Master Deployment Started ===${NC}"

# 1. Clean Slate (Optional, but recommended for clean ports)
echo -e "${BLUE}>>> Cleaning up existing PM2 processes...${NC}"
ssh -p 22 $VPS_HOST "pm2 delete yokaizen-campus-backend yokaizen-campus-frontend yokaizen-backend yokaizen-ailabs-frontend 2>/dev/null || true"

# 2. Deployment: Campus Backend
echo -e "${BLUE}>>> Deploying Campus Backend...${NC}"
scp -P 22 "yokaizen-campus-backend/campus-backend.tar.gz" $VPS_HOST:/var/www/yokaizen-campus/backend/
ssh -p 22 $VPS_HOST "cd /var/www/yokaizen-campus/backend && \
  tar -xzf campus-backend.tar.gz && \
  npm install && \
  npx prisma generate && \
  npm run build && \
  pm2 start dist/index.js --name 'yokaizen-campus-backend' --env PORT=7789 --update-env"

# 3. Deployment: Campus Frontend
echo -e "${BLUE}>>> Deploying Campus Frontend...${NC}"
scp -P 22 "yokaizen-campus_-post-code-orchestrator/campus-frontend.tar.gz" $VPS_HOST:/var/www/yokaizen-campus/frontend/
ssh -p 22 $VPS_HOST "mkdir -p /var/www/yokaizen-campus/frontend && \
  cd /var/www/yokaizen-campus/frontend && \
  tar -xzf campus-frontend.tar.gz && \
  npm install && \
  npm run build && \
  pm2 serve dist 7787 --spa --name 'yokaizen-campus-frontend'"

# 4. Deployment: AI Labs Backend
echo -e "${BLUE}>>> Deploying AI Labs Backend...${NC}"
scp -P 22 "AI Labs FULL project/yokaizen-backend/ai-labs-backend.tar.gz" $VPS_HOST:/var/www/yokaizen-backend/
ssh -p 22 $VPS_HOST "mkdir -p /var/www/yokaizen-backend && \
  cd /var/www/yokaizen-backend && \
  tar -xzf ai-labs-backend.tar.gz && \
  npm install && \
  npm run build && \
  pm2 start dist/index.js --name 'yokaizen-backend' --env PORT=7792 --update-env"

# 5. Deployment: AI Labs Frontend
echo -e "${BLUE}>>> Deploying AI Labs Frontend...${NC}"
scp -P 22 "AI Labs FULL project/yokaizen-ai-labs/ailabs-frontend.tar.gz" $VPS_HOST:/var/www/yokaizen-ai-labs/
ssh -p 22 $VPS_HOST "mkdir -p /var/www/yokaizen-ai-labs && \
  cd /var/www/yokaizen-ai-labs && \
  tar -xzf ailabs-frontend.tar.gz && \
  npm install --legacy-peer-deps && \
  npm run build && \
  pm2 serve dist 7791 --spa --name 'yokaizen-ailabs-frontend'"

# 6. Final Steps
echo -e "${BLUE}>>> Reloading Nginx and saving PM2...${NC}"
ssh -p 22 $VPS_HOST "nginx -t && systemctl reload nginx && pm2 save"

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo -e "verify at: https://yokaizencampus.com and https://ai.yokaizencampus.com"
