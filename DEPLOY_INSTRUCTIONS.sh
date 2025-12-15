#!/bin/bash
# ============================================
# Yokaizen AI Labs - Complete Deployment Commands
# ============================================
# Run these commands in order on your production server

echo "📋 Yokaizen AI Labs - Production Deployment Steps"
echo "=================================================="
echo ""

# ============================================
# STEP 1: Database Migration
# ============================================
echo "1️⃣ DATABASE MIGRATION"
echo "----------------------"
echo "cd /var/www/yokaizen-ailabs/backend"
echo "npm run migration:generate -- -n AddRewardCompetitionEntities"
echo "npm run migration:run"
echo ""
echo "Or run via psql:"
cat << 'EOF'
psql -U your_db_user -d yokaizen_campus << SQL
-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    type VARCHAR(20) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'COMMON',
    icon VARCHAR(255),
    image_url VARCHAR(255),
    cost INTEGER,
    stock INTEGER,
    code VARCHAR(100),
    link VARCHAR(255),
    criteria VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(20) DEFAULT 'UPCOMING',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    prize VARCHAR(255),
    min_level INTEGER DEFAULT 1,
    participants INTEGER DEFAULT 0,
    image_url VARCHAR(255),
    tasks JSONB,
    game_types JSONB,
    leaderboard JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_title ON competitions(title);
CREATE INDEX IF NOT EXISTS idx_rewards_name ON rewards(name);
SQL
EOF
echo ""

# ============================================
# STEP 2: Set Admin User
# ============================================
echo "2️⃣ SET ADMIN USER"
echo "------------------"
echo "Replace 'tabaremajem@gmail.com' with your admin email:"
echo ""
cat << 'EOF'
psql -U your_db_user -d yokaizen_campus -c \
  "UPDATE users SET role = 'ADMIN' WHERE email = 'tabaremajem@gmail.com';"
EOF
echo ""

# ============================================
# STEP 3: Configure Environment
# ============================================
echo "3️⃣ CONFIGURE ENVIRONMENT"
echo "-------------------------"
echo "Edit: /var/www/yokaizen-ailabs/backend/.env"
echo ""
echo "Required variables:"
cat << 'EOF'
NODE_ENV=production
PORT=7792

# Database
DATABASE_URL=postgresql://USER:PASS@localhost:5432/yokaizen_campus

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Firebase
FIREBASE_PROJECT_ID=yokaizen-campus
FIREBASE_CREDENTIALS_PATH=./firebase-admin.json

# AI APIs (at least one required)
GOOGLE_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key  # Optional
DEEPSEEK_API_KEY=your-deepseek-key  # Optional

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EOF
echo ""

# ============================================
# STEP 4: Deploy and Start
# ============================================
echo "4️⃣ DEPLOY AND START"
echo "--------------------"
cat << 'EOF'
# Option A: Use existing deploy script
cd /path/to/Campus\ FULL\ product
./deploy-ailabs.sh

# Option B: Manual commands
cd /var/www/yokaizen-ailabs/backend
npm install --production
npm run build
pm2 restart ailabs-backend

cd /var/www/yokaizen-ailabs/frontend
npm install
npm run build
pm2 restart ailabs-frontend
EOF
echo ""

# ============================================
# STEP 5: Verify Deployment
# ============================================
echo "5️⃣ VERIFY DEPLOYMENT"
echo "---------------------"
cat << 'EOF'
# Check API health
curl https://ai.yokaizencampus.com/api/v1/health

# Check PM2 status
pm2 status

# View logs
pm2 logs ailabs-backend --lines 50
pm2 logs ailabs-frontend --lines 50

# Test admin endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ai.yokaizencampus.com/api/v1/admin/stats
EOF
echo ""

echo "✅ Deployment steps complete!"
echo ""
echo "📝 Notes:"
echo "  - Frontend: https://ai.yokaizencampus.com"
echo "  - Backend:  https://ai.yokaizencampus.com/api/v1"
echo "  - Admin panel accessible to users with role = 'ADMIN'"
