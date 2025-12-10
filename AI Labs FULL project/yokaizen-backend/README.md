# 🎮 Yokaizen AI Labs Backend

Production-ready backend for the Yokaizen AI Labs platform - an AI-powered gamified wellness application combining interactive anime, AI companions, and biometric integration.

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Features](#-features)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Development](#-development)

## 🌟 Overview

Yokaizen AI Labs Backend provides:

- **Authentication**: Firebase Auth with JWT session management
- **Gamification**: XP, levels, streaks, energy system, skill trees
- **AI Services**: Gemini/OpenAI integration with RAG capabilities
- **Real-time**: Socket.io for squad rooms and live updates
- **Payments**: Stripe integration for subscriptions and credits
- **Squads**: Team features with war rooms and missions

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Server                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │   Auth   │  │   AI     │  │  Games   │  │   Payments   │    │
│  │ Service  │  │ Service  │  │ Service  │  │   Service    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Squads  │  │Leaderboard│ │   RAG    │  │    User      │    │
│  │ Service  │  │ Service  │  │ Service  │  │   Service    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │  Socket.io   │ │   BullMQ     │
│  + pgvector  │ │    Cache     │ │   Server     │ │   Workers    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ with TypeScript |
| Framework | Express.js |
| Database | PostgreSQL 16 with pgvector |
| Cache | Redis 7 |
| ORM | TypeORM |
| Real-time | Socket.io |
| Job Queue | BullMQ |
| AI | Google Gemini, OpenAI (fallback) |
| Auth | Firebase Admin SDK |
| Payments | Stripe |
| Storage | AWS S3 / Google Cloud Storage |
| Validation | Zod |
| Logging | Winston |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)
- Firebase project
- Stripe account
- Google Cloud / OpenAI API keys

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/yokaizen/backend.git
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Access at http://localhost:3000
```

### Manual Setup

```bash
# Install dependencies
npm install

# Setup database (ensure PostgreSQL is running)
npm run migration:run

# Start development server
npm run dev
```

## 📁 Project Structure

```
yokaizen-backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # TypeORM DataSource
│   │   ├── env.ts        # Environment validation
│   │   ├── redis.ts      # Redis client & helpers
│   │   ├── firebase.ts   # Firebase Admin SDK
│   │   ├── stripe.ts     # Stripe configuration
│   │   ├── storage.ts    # S3/GCS unified storage
│   │   └── logger.ts     # Winston logging
│   │
│   ├── entities/         # TypeORM entities
│   │   ├── User.ts
│   │   ├── Squad.ts
│   │   ├── GameHistory.ts
│   │   ├── Agent.ts
│   │   └── ...
│   │
│   ├── services/         # Business logic
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── GameService.ts
│   │   ├── AIService.ts
│   │   ├── PaymentService.ts
│   │   └── ...
│   │
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Express middleware
│   ├── routes/           # API route definitions
│   ├── socket/           # Socket.io handlers
│   ├── jobs/             # BullMQ workers
│   ├── utils/            # Helpers & utilities
│   ├── types/            # TypeScript types
│   └── index.ts          # Application entry
│
├── scripts/              # Database scripts
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 📚 API Documentation

### Authentication

```
POST /api/v1/auth/verify     - Verify Firebase token, create session
POST /api/v1/auth/refresh    - Refresh access token
POST /api/v1/auth/logout     - Invalidate session
```

### User

```
GET  /api/v1/user/me         - Get user profile
PATCH /api/v1/user/me        - Update profile
GET  /api/v1/user/stats      - Get detailed statistics
GET  /api/v1/user/inventory  - Get inventory items
POST /api/v1/user/skill/unlock - Unlock skill node
```

### Games

```
POST /api/v1/games/start     - Start game session
POST /api/v1/games/submit    - Submit game results
GET  /api/v1/games/history   - Get game history
GET  /api/v1/games/stats     - Get game statistics
```

### Squads

```
GET  /api/v1/squads          - List squads
POST /api/v1/squads          - Create squad (PRO only)
POST /api/v1/squads/:id/join - Join squad
POST /api/v1/squads/:id/deploy - Start squad mission
```

### AI Services

```
POST /api/v1/ai/chat         - Chat with AI agent
POST /api/v1/ai/generate-image - Generate image (OPERATIVE+)
POST /api/v1/ai/generate-game  - Generate game (PRO only)
POST /api/v1/ai/vision-analyze - Analyze image
POST /api/v1/ai/live-token   - Get Gemini Live API token
```

### Leaderboards

```
GET /api/v1/leaderboard/global    - Global rankings
GET /api/v1/leaderboard/squads    - Squad rankings
GET /api/v1/leaderboard/regional  - Regional rankings
GET /api/v1/leaderboard/me        - User's rankings
```

### Payments

```
POST /api/v1/payments/create-checkout-session - Start subscription
POST /api/v1/payments/portal      - Customer portal
POST /api/v1/payments/credits     - Purchase credits
GET  /api/v1/payments/transactions - Transaction history
```

## ✨ Features

### 🎮 Gamification System

- **XP & Levels**: `level = floor(sqrt(xp/100))`
- **Energy System**: Regenerates 1 per 5 minutes
- **Daily Streaks**: Up to 30-day bonus
- **Skill Trees**: 6 categories with unlockable nodes
- **Inventory**: Badges, skins, tools, boosts

### 🤖 AI Integration

- Primary: Google Gemini (Pro/Flash)
- Fallback: OpenAI GPT-4
- RAG: pgvector embeddings for knowledge bases
- Rate limits: Tier-based (FREE: 5/min, PRO: 50/min)

### 👥 Squad System

- Tiers: Rookie → Regular → Veteran → Elite
- War Rooms with real-time Socket.io
- Squad missions with collaborative goals
- Treasury and contributions

### 🔐 Security

- Firebase Authentication
- JWT session tokens
- Rate limiting (Redis-backed)
- Input validation (Zod)
- Prompt injection protection

## ⚙️ Configuration

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/yokaizen

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_CREDENTIALS_PATH=./firebase-admin.json

# Google AI
GOOGLE_API_KEY=your-api-key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_OPERATIVE_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx

# Storage (choose one)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_BUCKET_NAME=yokaizen-assets
AWS_REGION=ap-northeast-1
```

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build production image
docker build -t yokaizen-backend:latest .

# Run with environment file
docker run -d \
  --name yokaizen-api \
  -p 3000:3000 \
  --env-file .env.production \
  yokaizen-backend:latest
```

### Google Cloud Run

```bash
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/yokaizen-backend

# Deploy
gcloud run deploy yokaizen-backend \
  --image gcr.io/PROJECT_ID/yokaizen-backend \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yokaizen-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yokaizen-backend
  template:
    spec:
      containers:
      - name: api
        image: yokaizen-backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: yokaizen-secrets
```

## 🧑‍💻 Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run migration:generate  # Generate migration
npm run migration:run       # Run migrations
```

### Development Tools

Start with dev tools profile:

```bash
docker-compose --profile dev-tools up -d
```

Access:
- **Adminer** (PostgreSQL UI): http://localhost:8080
- **Redis Commander**: http://localhost:8081
- **Bull Board** (Job Queue): http://localhost:3001

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

### Logging

Logs are stored in `logs/` directory with daily rotation:
- `combined.log` - All logs
- `error.log` - Error logs only
- `http.log` - HTTP request logs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Proprietary - Yokaizen AI Labs © 2024

---

Built with ❤️ by the Yokaizen Team
