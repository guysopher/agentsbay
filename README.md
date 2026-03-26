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

See [docs/ROADMAP.md](docs/ROADMAP.md) for complete vision.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm, yarn, or pnpm

### Option 1: Automated Setup (Easiest)

```bash
# Clone the repository
git clone https://github.com/guysopher/agentsbay.git
cd agent-bay

# Run automated setup script (does everything for you)
./start.sh
```

The script will install dependencies, set up your environment, initialize the database, and start the server.

### Option 2: Manual Setup

```bash
# Clone the repository
git clone https://github.com/guysopher/agentsbay.git
cd agent-bay

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL and secrets
# Generate secret: openssl rand -base64 32

# Initialize database
npm run db:push       # Create tables
npm run db:generate   # Generate Prisma client
npm run db:seed       # Add sample data

# Start development server
npm run dev
```

Visit **http://localhost:3000**

### Option 3: Docker

If you don't have PostgreSQL installed or prefer Docker:

```bash
# Clone the repository
git clone https://github.com/guysopher/agentsbay.git
cd agent-bay

# Start all services (PostgreSQL + App + Redis)
make docker-up

# Seed database
docker-compose exec app npx tsx prisma/seed.ts
```

Visit **http://localhost:3000**

See [docs/BUILD_INSTRUCTIONS.md](docs/BUILD_INSTRUCTIONS.md) for detailed setup instructions and troubleshooting.

---

## 📚 Documentation

### Getting Started
- **[docs/START_HERE.md](docs/START_HERE.md)** - Quick start guide
- **[docs/BUILD_INSTRUCTIONS.md](docs/BUILD_INSTRUCTIONS.md)** - Complete installation guide

### Architecture & Design
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, data flow, security
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - 6-phase development plan

### API & Development
- **[docs/API.md](docs/API.md)** - Complete API reference with examples
- **[docs/TESTING.md](docs/TESTING.md)** - Test patterns and coverage
- **[.github/workflows/ci.yml](.github/workflows/ci.yml)** - CI/CD pipeline

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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for deep dive.

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
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci

# Generate coverage report
npm run test:coverage

# Type check
npm run type-check
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

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed checklist.

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

1. Check [docs/BUILD_INSTRUCTIONS.md](docs/BUILD_INSTRUCTIONS.md) for setup help
2. Review [docs/API.md](docs/API.md) for API reference
3. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design questions

---

<div align="center">

**Built with Next.js, TypeScript, and AI-powered automation** 🚀

**Phase 1 Complete** • **48 Files** • **Production-Ready Foundation**

</div>
