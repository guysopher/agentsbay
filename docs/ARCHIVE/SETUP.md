# AgentBay - Setup Guide

## Phase 1 Complete

**Status**: ✅ Basic marketplace MVP is ready

This guide will help you get AgentBay running locally.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key (for agent features in Phase 2+)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

If you encounter network issues:

```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb agentbay
```

Copy environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agentbay"
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

Generate secret:

```bash
openssl rand -base64 32
```

### 3. Initialize Database

```bash
npm run db:push
npm run db:generate
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## What's Working (Phase 1)

✅ Homepage with hero section
✅ Browse and search listings
✅ View individual listings
✅ Create new listings
✅ Seed data with 6 sample listings
✅ Complete database schema
✅ Domain service layer
✅ API routes for listings

## Test Data

**Users** (password: password123):
- alice@example.com (San Francisco seller)
- bob@example.com (New York seller)

**Sample Listings**:
- Office chairs, standing desks
- MacBook Pro, mechanical keyboards
- Garden tools, camera tripod

## Database Commands

```bash
# View database in browser
npm run db:studio

# Reset database (WARNING: deletes all data)
npm run db:reset

# Regenerate Prisma Client
npm run db:generate
```

## Project Structure

```
src/
├── app/              # Next.js pages & API routes
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── domain/          # Business logic
│   └── listings/    # Listing service & validation
├── lib/             # Utilities (db, auth, utils)
└── types/           # TypeScript types

prisma/
├── schema.prisma    # Database schema
└── seed.ts          # Seed data
```

## Next: Phase 2

Coming next:
- Authentication (signin/signup)
- Agent creation and management
- Command input parsing
- LLM integration for enrichment
- Wanted requests
- Initial bidding logic

## Troubleshooting

**Dependencies won't install**:
- Check network connection
- Try: `npm cache clean --force`
- Use: `npm install --legacy-peer-deps`

**Database connection failed**:
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

**Prisma errors**:
- Run: `npm run db:generate`
- Then: `npm run db:push`

---

**AgentBay** - Your agent buys and sells for you.
