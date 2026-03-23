# AgentBay - Installation Guide

This guide covers multiple ways to install and run AgentBay, including workarounds for network issues.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: Standard Installation](#option-1-standard-installation-recommended)
3. [Option 2: Docker Installation](#option-2-docker-installation-network-issues)
4. [Option 3: Offline Installation](#option-3-offline-installation)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Optional (for different installation methods)
- **Docker** - [Download](https://www.docker.com/products/docker-desktop/)
- **Yarn** or **pnpm** - Alternative package managers

---

## Option 1: Standard Installation (Recommended)

### Step 1: Fix Network Access

If you're having npm connectivity issues:

```bash
# Check current proxy settings
npm config get proxy
npm config get https-proxy

# If behind a corporate proxy, set it:
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Or try a different registry
npm config set registry https://registry.npmmirror.com/

# Verify connectivity
curl -I https://registry.npmjs.org
```

### Step 2: Install Dependencies

```bash
cd agent-bay
npm install
```

If npm fails, try alternatives:

```bash
# Try with yarn
yarn install

# Or with pnpm
pnpm install

# Or force with legacy peer deps
npm install --legacy-peer-deps
```

### Step 3: Database Setup

```bash
# Create database
createdb agentbay

# Or using psql
psql -U postgres
CREATE DATABASE agentbay;
\q
```

### Step 4: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

Required environment variables:

```env
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/agentbay"

# Auth (generate secret below)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

Generate a secure secret:

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 5: Initialize Database

```bash
# Push Prisma schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Seed sample data
npm run db:seed
```

### Step 6: Run the App

```bash
npm run dev
```

Visit http://localhost:3000

---

## Option 2: Docker Installation (Network Issues?)

If you're having npm issues, Docker includes all dependencies.

### Prerequisites

- Docker Desktop installed
- Docker Compose installed (included with Docker Desktop)

### Step 1: Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Generate secret
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Add to .env file
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env
```

### Step 2: Build and Run

```bash
# Start all services (PostgreSQL + App + Redis)
npm run docker:up

# Or manually:
docker-compose up -d
```

This will:
- Pull required images
- Build the Next.js app
- Start PostgreSQL database
- Start Redis (for future caching)
- Run database migrations
- Start the app on port 3000

### Step 3: View Logs

```bash
# View app logs
npm run docker:logs

# Or manually:
docker-compose logs -f app
```

### Step 4: Seed Database

```bash
# Execute seed script in container
docker-compose exec app npx tsx prisma/seed.ts
```

### Step 5: Access the App

Visit http://localhost:3000

### Managing Docker Services

```bash
# Stop all services
npm run docker:down

# Restart services
docker-compose restart

# View running containers
docker-compose ps

# Access database
docker-compose exec postgres psql -U agentbay -d agentbay

# Access app shell
docker-compose exec app sh
```

---

## Option 3: Offline Installation

If you're completely offline or have severe network restrictions:

### Step 1: Get Dependencies (on a machine with internet)

```bash
# On a machine WITH internet access:
npm install
tar -czf node_modules.tar.gz node_modules package-lock.json
```

### Step 2: Transfer Files

Transfer the following to your offline machine:
- Entire project folder
- `node_modules.tar.gz`

### Step 3: Extract Dependencies (on offline machine)

```bash
# Extract dependencies
tar -xzf node_modules.tar.gz

# Verify
ls node_modules/@prisma
```

### Step 4: Continue with Standard Setup

Follow steps 3-6 from Option 1 (Database Setup onwards).

---

## Troubleshooting

### Issue: Cannot connect to npm registry

**Error**: `Failed to connect to registry.npmjs.org port 443`

**Solutions**:
1. Check firewall settings
2. Try Docker installation (Option 2)
3. Use offline installation (Option 3)
4. Set proxy if behind corporate network:
   ```bash
   npm config set proxy http://proxy:port
   ```

### Issue: Prisma Client not generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm run db:generate
```

### Issue: Database connection failed

**Error**: `Can't reach database server at localhost:5432`

**Solutions**:
1. Ensure PostgreSQL is running:
   ```bash
   # Mac (with Homebrew)
   brew services start postgresql

   # Linux (systemd)
   sudo systemctl start postgresql

   # Windows
   # Start via Services app or pg_ctl
   ```

2. Check connection string in `.env`
3. Verify PostgreSQL is listening:
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### Issue: Port 3000 already in use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Find process using port
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or run on different port
PORT=3001 npm run dev
```

### Issue: TypeScript errors after installation

**Error**: Various TypeScript errors

**Solutions**:
```bash
# Regenerate Prisma Client
npm run db:generate

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Clear Next.js cache
rm -rf .next
```

### Issue: Docker build fails

**Error**: Docker build errors

**Solutions**:
```bash
# Rebuild without cache
docker-compose build --no-cache

# Check Docker memory allocation (increase if needed)
# Docker Desktop → Settings → Resources → Memory

# Clear Docker system
docker system prune -a
```

### Issue: Seed script fails

**Error**: Errors during `npm run db:seed`

**Solutions**:
```bash
# Reset database completely
npm run db:reset

# Then try seed again
npm run db:seed

# Or manually:
npx prisma db push --force-reset
npm run db:seed
```

---

## Verify Installation

After installation, verify everything works:

### 1. Check Database Connection

```bash
npm run db:studio
```

Should open Prisma Studio at http://localhost:5555

### 2. Check App is Running

```bash
curl http://localhost:3000
```

Should return HTML

### 3. Check Seed Data

Visit:
- http://localhost:3000 - Homepage
- http://localhost:3000/browse - Should show 6 sample listings

### 4. Run Tests

```bash
npm run test:ci
```

Should pass all tests

### 5. Check Build

```bash
npm run build
```

Should build successfully

---

## Next Steps

Once installed, see:

- **SETUP.md** - Quick start guide
- **QUICK_REFERENCE.md** - Common tasks
- **ARCHITECTURE.md** - System design
- **ROADMAP.md** - Development phases

---

## Getting Help

If you're still having issues:

1. Check all environment variables are set correctly in `.env`
2. Ensure PostgreSQL is running and accessible
3. Try Docker installation as it's more isolated
4. Review logs: `docker-compose logs -f` or console output
5. Open an issue with:
   - Installation method tried
   - Error messages
   - Environment (OS, Node version, etc.)

---

**Once installed successfully, you'll have a fully functional AgentBay marketplace!** 🚀
