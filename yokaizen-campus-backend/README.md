# 🎓 Yokaizen Campus Backend

> The Central Cortex - Backend for Yokaizen Campus post-code educational platform

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Configuration](#configuration)
- [Database](#database)
- [Deployment](#deployment)

## 🌟 Overview

Yokaizen Campus is a post-code educational platform that combines AI-powered agent workflows, gamification, and real-time classroom collaboration. This backend provides:

- **Hybrid AI Engine**: Model-agnostic AI proxy supporting multiple providers
- **Real-time Classrooms**: WebSocket-powered live collaboration
- **Gamification System**: XP, levels, achievements, and career paths
- **Teacher Analytics (Athena)**: Real-time student insights and classroom management
- **Parent Portal**: Progress tracking and credit sponsorship
- **Multi-Philosophy Modes**: Finland (exploratory), Korea (competitive), Japan (balanced)

## ✨ Features

### Core Features
- 🤖 **AI Agent Workflows** - Multi-agent graph execution with audit capabilities
- 🏫 **Classroom Management** - Real-time student status, broadcasts, chaos events
- 🎮 **Gamification** - XP system, 15 levels, achievements, AR unlocks
- 📊 **Teacher Dashboard (Athena)** - Classroom velocity, alerts, AI summaries
- 👨‍👧 **Parent Portal** - Weekly reports, progress tracking, credit sponsorship
- 🌍 **NGO Grant System** - Application, review, and credit allocation

### Philosophy Modes
- 🇫🇮 **Finland Mode** - Exploratory learning, minimal structure
- 🇰🇷 **Korea Mode** - Intense, competitive, structured approach
- 🇯🇵 **Japan Mode** - Balanced craftsman mindset (default)

### Agent Types
| Agent | Level | Cost | Description |
|-------|-------|------|-------------|
| SCOUT | 1 | 5 | Fast research, gathers raw data |
| CREATIVE | 3 | 15 | Generates creative solutions |
| CRITIC | 5 | 10 | Evaluates and critiques |
| ANALYST | 6 | 12 | Deep analysis and patterns |
| DEBUGGER | 7 | 10 | Problem identification |
| ETHICIST | 8 | 12 | Ethical considerations |
| ARCHITECT | 10 | 15 | Structures and organizes |
| SYNTHESIZER | 12 | 20 | Combines insights |
| COMMANDER | 15 | 30 | Orchestrates workflows |
| ORACLE | AR | 25 | Hidden agent (AR unlock) |

## 🛠 Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript 5.6
- **Database**: PostgreSQL 16 + Prisma ORM
- **Cache**: Redis 7
- **Real-time**: Socket.io
- **AI Providers**: OpenAI, Anthropic, Google AI, OpenRouter
- **Payments**: Stripe
- **Auth**: JWT + bcrypt

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yokaizen/campus-backend.git
cd campus-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Generate Prisma client**
```bash
npm run db:generate
```

5. **Run database migrations**
```bash
npm run db:push
```

6. **Seed the database**
```bash
npm run db:seed
```

7. **Start development server**
```bash
npm run dev
```

### Using Docker

```bash
# Development
docker-compose --profile dev up

# Production
docker-compose --profile prod up -d

# With Prisma Studio
docker-compose --profile tools up prisma-studio
```

## 📁 Project Structure

```
yokaizen-campus-backend/
├── src/
│   ├── config/          # Configuration and environment
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   ├── contentFilter.ts  # Safety filtering
│   │   ├── errorHandler.ts   # Error handling
│   │   └── rateLimiter.ts    # Rate limiting
│   ├── prisma/          # Database schema and seeds
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── AiEngine.ts       # AI proxy service
│   │   ├── AthenaService.ts  # Teacher analytics
│   │   ├── AuthService.ts    # Authentication
│   │   ├── ClassroomService.ts
│   │   ├── GamificationService.ts
│   │   ├── GraphService.ts
│   │   ├── GrantService.ts
│   │   ├── ParentService.ts
│   │   └── PaymentService.ts
│   ├── sockets/         # WebSocket gateway
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Helpers and utilities
│   └── index.ts         # Entry point
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Get profile |

### Classroom
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/classroom` | Create classroom |
| POST | `/api/v1/classroom/join` | Join with code |
| GET | `/api/v1/classroom/:id/live` | Get live state |
| POST | `/api/v1/classroom/:id/broadcast` | Send message |
| POST | `/api/v1/classroom/:id/chaos` | Trigger chaos event |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/command` | Generate graph |
| POST | `/api/v1/ai/simulate` | Run node |
| POST | `/api/v1/ai/audit` | Verify output |
| GET | `/api/v1/ai/agents` | List agents |

### Graph
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/graph` | Create session |
| PUT | `/api/v1/graph/:id/sync` | Sync state |
| POST | `/api/v1/graph/:id/audit` | Audit node |

### Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/gamification/profile` | Get profile |
| GET | `/api/v1/gamification/career` | Get career path |
| GET | `/api/v1/gamification/leaderboard` | Get rankings |

### Parent Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/parent/link` | Link to child |
| GET | `/api/v1/parent/child/:id/report` | Get report |

### Teacher Analytics (Athena)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/athena/classroom/:id` | Get insights |
| GET | `/api/v1/athena/classroom/:id/summary` | AI summary |

## 📡 WebSocket Events

### Client → Server
| Event | Description |
|-------|-------------|
| `join_classroom` | Join a classroom room |
| `student_update` | Send status update |
| `raise_hand` | Request help |
| `graph_update` | Sync graph changes |

### Server → Client
| Event | Description |
|-------|-------------|
| `classroom_state` | Full state sync |
| `student_status_update` | Student changed |
| `teacher_broadcast` | Message from teacher |
| `chaos_event` | Chaos event triggered |
| `philosophy_change` | Mode changed |
| `level_up` | Student leveled up |

## ⚙️ Configuration

See `.env.example` for all configuration options. Key settings:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Feature Flags
ENABLE_MOCK_AI=true  # For development without API keys
```

## 🗄 Database

### Generate migrations
```bash
npm run db:migrate
```

### Push schema (dev)
```bash
npm run db:push
```

### Open Prisma Studio
```bash
npm run db:studio
```

### Seed database
```bash
npm run db:seed
```

## 🚢 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker build -t yokaizen-campus-backend .
docker run -p 3000:3000 --env-file .env yokaizen-campus-backend
```

### Environment Variables
Ensure all required environment variables are set in production:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- AI provider keys (at least one)
- `STRIPE_SECRET_KEY` (for payments)

## 📝 Demo Accounts

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@yokaizen.com | demo123456 |
| Teacher | teacher@demo.yokaizen.edu | demo123456 |
| Student | alex@demo.yokaizen.edu | demo123456 |
| Parent | parent@demo.yokaizen.edu | demo123456 |

**Classroom Access Code**: `DEMO01`

## 📄 License

MIT © Yokaizen

---

Built with ❤️ by the Yokaizen Team
