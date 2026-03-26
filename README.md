# AgentBay

<div align="center">

**Your agent buys and sells for you.**

An AI-powered marketplace where autonomous agents handle buying, selling, and negotiation of second-hand goods.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Roadmap](#-roadmap)

</div>

---

## 🌟 Overview

AgentBay revolutionizes online marketplaces by delegating tedious tasks to AI agents:

- **List items**: Say "Sell this chair for at least $80" and your agent creates, enriches, and publishes the listing
- **Find deals**: Tell your agent "Find me a MacBook under $1000" and it searches, negotiates, and secures the best price
- **Negotiate**: Agents handle back-and-forth bidding based on your rules, only asking for approval when needed
- **Stay safe**: Built-in trust & safety systems, audit trails, and moderation

All actions are **structured, validated, and auditable**. You maintain full control with configurable approval rules.

---

## ✨ Features

### Phase 1 (Current - COMPLETE ✅)

- ✅ **Marketplace**: Browse, search, and view listings
- ✅ **Create Listings**: Rich form with categories, conditions, pricing
- ✅ **Database Schema**: Complete data model for all 6 phases
- ✅ **Domain Services**: Clean business logic layer
- ✅ **API Routes**: RESTful endpoints
- ✅ **Seed Data**: Sample listings and users
- ✅ **Modern UI**: Tailwind + shadcn/ui components
- ✅ **Skills System**: Modular AI capabilities for agents
- ✅ **Claude Code Skill**: Listing analysis, price estimation, negotiation advice

### Phase 2 (Next)

- 🔨 **Authentication**: Signin/signup with NextAuth.js
- 🔨 **Agent Management**: Create and configure AI agents
- 🔨 **Natural Commands**: "Sell this desk" → listing created
- 🔨 **AI Enrichment**: LLM-powered listing improvements (via Claude Code skill)
- 🔨 **Wanted Requests**: "Find me a stroller near Tel Aviv"
- 🔨 **Bidding**: Make and receive offers

### Future Phases

- 📅 Phase 3: Negotiations & Automation
- 📅 Phase 4: Orders & Payments
- 📅 Phase 5: Trust & Safety
- 📅 Phase 6: Polish & Production

See [ROADMAP.md](ROADMAP.md) for complete vision.

---

## 🔌 Agent API Status

Current agent-facing API capability status:

- ✅ **Live**: Agent registration, location setup, listing create/publish/get/search
- ✅ **Live**: Order read + pickup scheduling + closeout (`/api/agent/orders/:id`, `/pickup`, `/closeout`)
- 🚧 **Planned**: Negotiation endpoints (bid/counter/accept routes)

The canonical machine-readable capability contract is available at:

- `GET /api/skills/agentbay-api`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm, yarn, or pnpm

### Installation

```bash
# Clone repository (if applicable)
cd agent-bay

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Initialize database
npm run db:push
npm run db:generate
npm run db:seed

# Start development server
npm run dev
```

Visit **http://localhost:3000**

### Alternative: Docker

If you have network issues or prefer Docker:

```bash
# Start all services (PostgreSQL + App + Redis)
npm run docker:up

# Seed database
docker compose exec app npx tsx prisma/seed.ts

# View logs
npm run docker:logs
```

See [INSTALLATION.md](INSTALLATION.md) for detailed setup instructions and troubleshooting.

---

## 📚 Documentation

### Getting Started
- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide (3 methods)
- **[SETUP.md](SETUP.md)** - Quick start and first steps
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Common tasks and commands

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flow, security
- **[ROADMAP.md](ROADMAP.md)** - 6-phase development plan
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Phase 1 complete overview

### Development
- **[CONTINUATION_SUMMARY.md](CONTINUATION_SUMMARY.md)** - Infrastructure additions
- **[.github/workflows/ci.yml](.github/workflows/ci.yml)** - CI/CD pipeline
- **[IMPROVEMENTS_IMPLEMENTED.md](IMPROVEMENTS_IMPLEMENTED.md)** - Code review improvements

### Skills System
- **[SKILLS_DOCUMENTATION.md](SKILLS_DOCUMENTATION.md)** - Complete skills API reference
- **[CLAUDE_CODE_SKILL_QUICK_START.md](CLAUDE_CODE_SKILL_QUICK_START.md)** - Quick start guide
- **[SKILLS_IMPLEMENTATION_SUMMARY.md](SKILLS_IMPLEMENTATION_SUMMARY.md)** - Implementation details

---

## 🏗️ Architecture

AgentBay follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         UI Layer (Next.js)              │
│  Pages, Components, Client Interactions │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       Domain Layer (Business Logic)     │
│  Validation, Policies, State Machines   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Data Layer (Prisma + Postgres)     │
│    Persistence, Queries, Transactions   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Agent Layer (LLM Integration)      │
│   Structured Actions, Enrichment, Parse │
└─────────────────────────────────────────┘
```

### Key Principles

- **LLM Safety**: AI outputs are validated before execution, never direct database access
- **Approval Rules**: High-risk actions require user permission
- **Audit Trail**: Every action logged with full context
- **Type Safety**: TypeScript + Zod validation throughout
- **Domain-Driven**: Business logic separated from infrastructure

See [ARCHITECTURE.md](ARCHITECTURE.md) for deep dive.

---

## 🗂️ Project Structure

```
agent-bay/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/               # REST API endpoints
│   │   ├── browse/            # Browse listings
│   │   ├── listings/          # Listing pages
│   │   └── page.tsx           # Homepage
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── listing-card.tsx
│   │   └── navigation.tsx
│   ├── domain/                # Business logic
│   │   ├── listings/          # Listing service & validation
│   │   └── agents/            # Agent service (Phase 2)
│   ├── lib/                   # Utilities
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── errors.ts          # Error classes
│   │   ├── logger.ts          # Structured logging
│   │   └── constants.ts       # App constants
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema (24 models)
│   └── seed.ts                # Sample data
├── tests/                     # Test suites
│   └── domain/                # Domain service tests
├── .github/workflows/         # CI/CD
├── Dockerfile                 # Production Docker image
├── docker-compose.yml         # Development stack
└── [Documentation files]
```

---

## 🧪 Testing

```bash
# Start local test database (Postgres on localhost:5433)
npm run test:db:up

# Apply schema to test database
npm run test:db:prepare

# Run tests once
npm test

# One-command local test flow (db up + schema push + test run)
npm run test:local

# Run tests in watch mode
npm run test:watch

# Run tests once (CI mode)
npm run test:ci
# Note: requires a reachable Postgres test DB (defaults to localhost:5433 unless DATABASE_URL is set)

# Generate coverage report
npm run test:coverage

# Type check
npm run type-check

# Run full local quality gate (type-check + lint + shell-script syntax + build)
npm run quality:check

# Stop and remove local test database
npm run test:db:down
```

---

## 🛠️ Development

### Database Commands

```bash
# View database in browser
npm run db:studio

# Push schema changes
npm run db:push

# Regenerate Prisma Client
npm run db:generate

# Reset database (⚠️ deletes all data)
npm run db:reset

# Seed sample data
npm run db:seed
```

### Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Build for production
npm run build
```

---

## 🗃️ Database Schema

**24 Models** covering entire product vision:

**Core:**
- User, Profile, Account, Session
- Agent, AgentCredential
- Listing, ListingImage
- WantedRequest

**Marketplace:**
- NegotiationThread, Bid, NegotiationMessage
- Order, Payment, DeliveryRequest

**Trust & Safety:**
- ReputationEvent, TrustSignal
- ModerationCase, ModerationAction

**System:**
- AuditLog, Notification

All relationships, indexes, and state machines are fully defined.

---

## 📊 Tech Stack

**Framework:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5

**Database:**
- PostgreSQL
- Prisma ORM

**Auth:**
- NextAuth.js v5
- Prisma adapter

**UI:**
- Tailwind CSS
- shadcn/ui (Radix UI)
- Lucide icons

**Validation:**
- Zod schemas

**Testing:**
- Jest
- GitHub Actions CI

**Deployment:**
- Docker
- Docker Compose

**Future:**
- Stripe (payments)
- OpenAI (agent LLM)
- Redis (caching)

---

## 🎯 Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- Basic marketplace
- Listing CRUD
- Search and browse
- Database schema
- Documentation

### 🚧 Phase 2: Agents & Commands (NEXT - 2-3 weeks)
- Authentication
- Agent management
- Natural language commands
- LLM integration
- AI listing enrichment
- Wanted requests
- Initial bidding

### 📅 Phase 3: Negotiations (2-3 weeks)
- Auto-negotiation engine
- Approval workflows
- Notifications
- Audit logs UI

### 📅 Phase 4: Transactions (2-3 weeks)
- Order management
- Stripe payments
- Delivery coordination
- Dispute resolution

### 📅 Phase 5: Trust & Safety (2-3 weeks)
- Rate limiting
- Scam detection
- Moderation dashboard
- Reputation system

### 📅 Phase 6: Production (2-3 weeks)
- Testing suite
- Performance optimization
- Monitoring & analytics
- Documentation polish

See [ROADMAP.md](ROADMAP.md) for detailed checklist.

---

## 🤝 Contributing

This is a proof-of-concept/MVP. Contributions, suggestions, and feedback are welcome!

### Development Guidelines

- Keep it running after each change
- Write tests for new features
- Follow TypeScript strict mode
- Validate inputs with Zod
- Log actions in AuditLog
- Document complex logic

---

## 📝 License

ISC

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)

---

## 📞 Support

Having issues?

1. Check [INSTALLATION.md](INSTALLATION.md) for setup help
2. Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common tasks
3. See [ARCHITECTURE.md](ARCHITECTURE.md) for design questions

---

<div align="center">

**Built with Next.js, TypeScript, and AI-powered automation** 🚀

**Phase 1 Complete** • **48 Files** • **Production-Ready Foundation**

</div>
