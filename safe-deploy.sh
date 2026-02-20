#!/bin/bash
# ============================================
# SAFE DEPLOYMENT SCRIPT (Updates Code Only)
# ============================================
# Usage: ./safe-deploy.sh
# 
# This script assumes you have uploaded the latest code to:
# ~/yokaizen-deploy/ (containing yokaizen-ailabs, yokaizen-campus, etc.)
# 
# It will:
# 1. Backup running versions in /var/www/
# 2. Safely swap the new code
# 3. Gracefully reload PM2 processes
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔒 STARTING SAFE DEPLOYMENT...${NC}"

# 1. VALIDATE SOURCE
# Adjust this path to where you uploaded the code on the VPS
SOURCE_DIR=$(pwd) 

if [ ! -d "$SOURCE_DIR/AI Labs FULL project" ]; then
    echo -e "${RED}❌ Error: Could not find source code in current directory.${NC}"
    echo "Please run this script from the root of your uploaded project folder."
    exit 1
fi

# 2. DEFINE TARGETS
BACKEND_AI_SRC="$SOURCE_DIR/AI Labs FULL project/yokaizen-backend"
FRONTEND_AI_SRC="$SOURCE_DIR/AI Labs FULL project/yokaizen-ai-labs"
BACKEND_CAMPUS_SRC="$SOURCE_DIR/yokaizen-campus-backend"
FRONTEND_CAMPUS_SRC="$SOURCE_DIR/yokaizen-campus_-post-code-orchestrator"

TARGET_BASE="/var/www"

# 3. BACKUP & DEPLOY FUNCTION
deploy_component() {
    NAME=$1
    SRC=$2
    DEST_DIR=$3 # e.g. /var/www/yokaizen-ailabs/backend

    echo -e "${YELLOW}>> Deploying $NAME...${NC}"

    if [ ! -d "$SRC" ]; then
        echo -e "${RED}⚠️  Source $SRC not found. Skipping.${NC}"
        return
    fi

    # Create Dest if missing
    mkdir -p "$DEST_DIR"

    # Backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    if [ "$(ls -A $DEST_DIR)" ]; then
        echo "   Backing up current version..."
        tar -czf "${DEST_DIR}_backup_$TIMESTAMP.tar.gz" -C "$DEST_DIR" .
    fi

    # Copy new files (using rsync to preserve permissions and delete deleted files)
    echo "   Syncing files..."
    # Exclude node_modules if you want to install fresh, but here we sync everything except local dev envs
    rsync -av --delete --exclude 'node_modules' --exclude '.env' --exclude '.git' "$SRC/" "$DEST_DIR/"
    
    # Restore .env if it exists in backup (or ensure it's not overwritten if we excluded it)
    # Since we excluded .env in rsync, the production .env in DEST_DIR stays safe.
    
    # Install dependencies & Build (if needed, but ideally we deploy built artifacts)
    echo "   Installing dependencies..."
    cd "$DEST_DIR"
    npm install --production --silent --legacy-peer-deps
    
    # If dist doesn't exist or we want to ensure fresh build on server:
    # npm run build 
    # (Assuming we deployed pre-built 'dist' folders from the upload. If not, uncomment build)

    echo -e "${GREEN}   $NAME Updated.${NC}"
}

# 4. EXECUTE DEPLOYMENTS
echo "------------------------------------------------"
deploy_component "AI Labs Backend" "$BACKEND_AI_SRC" "$TARGET_BASE/yokaizen-ailabs/backend"
deploy_component "AI Labs Frontend" "$FRONTEND_AI_SRC" "$TARGET_BASE/yokaizen-ailabs/frontend"
deploy_component "Campus Backend" "$BACKEND_CAMPUS_SRC" "$TARGET_BASE/yokaizen-campus/backend"
deploy_component "Campus Frontend" "$FRONTEND_CAMPUS_SRC" "$TARGET_BASE/yokaizen-campus/frontend"

# 5. RELOAD PM2
echo "------------------------------------------------"
echo -e "${YELLOW}>> Reloading Processes...${NC}"

# Check if ecosystem exists in target, else copy it
if [ ! -f "/var/www/ecosystem.config.js" ]; then
    cp "$SOURCE_DIR/ecosystem.config.js" "/var/www/ecosystem.config.js"
fi

pm2 reload /var/www/ecosystem.config.js || pm2 start /var/www/ecosystem.config.js

echo -e "${GREEN}✅ SAFE DEPLOYMENT COMPLETE!${NC}"
echo "   - Backups created in /var/www/"
echo "   - Services reloaded"
