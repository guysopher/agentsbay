# 🔨 AgentBay - Build Instructions

You asked to "build it" - here's exactly how to get AgentBay running on your machine.

---

## 🚀 Fastest Way to Get Running

We've created automated scripts that do all the work:

```bash
# Clone the repository first
git clone https://github.com/guysopher/agentsbay.git
cd agent-bay

# One command to rule them all:
./start.sh
```

That's it! The script will:
1. Check for dependencies
2. Install them if needed
3. Setup your environment
4. Initialize the database
5. Seed sample data
6. Start the development server

---

## 📋 Manual Build (Step by Step)

If you prefer to do it manually or the script has issues:

### Step 1: Install Dependencies

```bash
# We've created an installer that tries multiple methods:
./install.sh

# It will try:
# 1. npm install
# 2. npm install --legacy-peer-deps
# 3. Clean cache + reinstall
# 4. yarn (if available)
# 5. pnpm (if available)
```

**If that fails** (network issues), use Docker:
```bash
make docker-up
```

### Step 2: Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Generate secure secret
SECRET=$(openssl rand -base64 32)

# Edit .env with your settings:
nano .env
```

**Required in .env:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/agentbay"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[paste your generated secret]"
```

### Step 3: Database Setup

```bash
# Create PostgreSQL database
createdb agentbay

# Initialize with Prisma
npm run db:push        # Push schema to database
npm run db:generate    # Generate Prisma Client
npm run db:seed        # Load sample data
```

**Or use Make:**
```bash
make setup  # Does all of the above
```

### Step 4: Build & Run

```bash
# Development mode (hot reload)
npm run dev

# Or with Make:
make dev
```

**Production build:**
```bash
npm run build
npm start
```

### Step 5: Verify

Open your browser:
- **Homepage**: http://localhost:3000
- **Browse**: http://localhost:3000/browse
- **Database**: Run `make db-studio` for visual DB browser

---

## 🐳 Docker Build (Recommended if Network Issues)

If npm installation fails due to network restrictions:

### Quick Docker Start

```bash
# Start everything (PostgreSQL + App + Redis)
make docker-up

# Wait for services to start (30 seconds)
sleep 30

# Seed the database
docker-compose exec app npx tsx prisma/seed.ts

# View logs
make docker-logs
```

### Manual Docker Commands

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

**Access the app**: http://localhost:3000

---

## ✅ Verification

Run the verification script to check your setup:

```bash
./verify.sh
```

This checks:
- ✓ Node.js and npm installed
- ✓ Project files present
- ✓ Dependencies installed
- ✓ Environment configured
- ✓ Database accessible
- ✓ TypeScript compiles

---

## 🎯 What You'll Get

After successful build:

### 1. Working Marketplace
- Beautiful homepage with hero section
- Search functionality
- Browse listings grid
- Individual listing pages
- Create listing form

### 2. Sample Data
**6 Listings:**
- Office furniture (chair, desk)
- Electronics (MacBook, keyboard, tripod)
- Home goods (garden tools)

**2 Users:**
- alice@example.com (San Francisco seller)
- bob@example.com (New York seller)

**2 AI Agents:**
- Configured with different negotiation rules
- Ready for Phase 2 implementation

### 3. Admin Tools
- Prisma Studio (visual database browser)
- Test suite ready to run
- CI/CD pipeline configured
- Docker deployment ready

---

## 🛠️ Build Troubleshooting

### Issue: Network Errors During Install

**Error**: `Failed to connect to registry.npmjs.org`

**Solutions:**

**Option 1: Configure Proxy**
```bash
npm config set proxy http://proxy:port
npm config set https-proxy http://proxy:port
./install.sh
```

**Option 2: Use Docker**
```bash
make docker-up
```

**Option 3: Different Registry**
```bash
npm config set registry https://registry.npmmirror.com/
./install.sh
```

### Issue: Database Connection Failed

**Error**: `Can't reach database server`

**Solutions:**

```bash
# Check PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL
brew services start postgresql        # macOS
sudo systemctl start postgresql       # Linux

# Create database
createdb agentbay

# Verify connection
psql -U postgres -h localhost -c "SELECT 1"
```

### Issue: TypeScript Errors

**Error**: `Cannot find module '@prisma/client'`

**Solution:**
```bash
npm run db:generate
```

### Issue: Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
PORT=3001 npm run dev
```

---

## 📊 Build Verification Checklist

After running the build, verify:

- [ ] Dependencies installed (`node_modules` exists)
- [ ] Environment configured (`.env` file exists)
- [ ] Database created (can connect via `psql`)
- [ ] Prisma Client generated (`node_modules/.prisma/client`)
- [ ] Sample data loaded (6 listings visible)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Homepage loads (http://localhost:3000)
- [ ] Can browse listings
- [ ] Can view listing details
- [ ] Can create new listing

---

## 🎓 Available Build Configurations

### Development Build
```bash
npm run dev
# Features:
# - Hot module reload
# - Source maps
# - Detailed error messages
# - Fast refresh
```

### Production Build
```bash
npm run build
npm start
# Features:
# - Optimized bundles
# - Minified code
# - Static generation
# - Performance optimized
```

### Docker Build
```bash
make docker-up
# Features:
# - All dependencies included
# - PostgreSQL + Redis included
# - Network isolation
# - Easy deployment
```

### Test Build
```bash
npm run test:ci
# Features:
# - Runs all tests
# - Type checking
# - Linting
# - Coverage report
```

---

## 🚦 Build Status Indicators

During build you'll see:

**Success Indicators:**
- ✓ Dependencies installed
- ✓ Prisma Client generated
- ✓ Database connected
- ✓ Compiled successfully
- ✓ Ready on http://localhost:3000

**Warning Indicators:**
- ⚠ No .env file (create from .env.example)
- ⚠ Database not seeded (run db:seed)
- ⚠ PostgreSQL not running (start service)

**Error Indicators:**
- ✗ Network error (check connectivity)
- ✗ TypeScript errors (check code)
- ✗ Database error (check connection)

---

## 📈 Next Steps After Build

Once built successfully:

### 1. Explore the Application
```bash
# Open in browser
open http://localhost:3000

# Open database browser
make db-studio
```

### 2. Run Tests
```bash
make test-ci
```

### 3. Check Documentation
- [START_HERE.md](START_HERE.md) - Quickstart guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [ROADMAP.md](ROADMAP.md) - Development phases
- [API.md](API.md) - Complete API reference

### 4. Start Development
- Read Phase 2 requirements in ROADMAP.md
- Check domain services in `src/domain`
- Review database schema in `prisma/schema.prisma`

---

## 💡 Pro Tips

**Speed up builds:**
```bash
# Use pnpm (fastest)
pnpm install

# Use Turbopack (Next.js 15)
npm run dev  # Already uses --turbopack
```

**Clean builds:**
```bash
make clean   # Remove all artifacts
make setup   # Fresh install
```

**Quick restarts:**
```bash
# Don't restart server, just:
# - Edit files
# - Save
# - Browser auto-refreshes
```

---

## 🎉 Success!

You should now have AgentBay running locally!

**Quick commands:**
```bash
make dev          # Start development
make db-studio    # View database
make test         # Run tests
make help         # See all commands
```

**Visit**: http://localhost:3000

---

## 🆘 Still Having Issues?

1. Run `./verify.sh` to diagnose issues
2. Try Docker: `make docker-up`
3. Check logs: `make docker-logs` or console output
4. Review [API.md](API.md) for endpoint documentation
5. Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design

---

**The project is fully set up and ready to run!** 🚀

Just run `./start.sh` or `make dev` to get started!
