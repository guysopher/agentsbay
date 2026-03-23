# 🚀 Get Started with AgentBay

Welcome! This guide will get AgentBay running on your machine in 3 simple steps.

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Install dependencies
./install.sh

# 2. Setup everything
make setup

# 3. Run the app
make dev
```

That's it! Visit **http://localhost:3000**

---

## 📋 Step-by-Step Guide

### Step 1: Install Dependencies

We've created multiple installation methods for different scenarios:

**Option A: Automatic (Recommended)**
```bash
./install.sh
```
This tries multiple installation methods automatically.

**Option B: Manual with npm**
```bash
npm install
```

**Option C: Manual with yarn**
```bash
yarn install
```

**Option D: Docker (if network issues)**
```bash
make docker-up
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate a secure secret
openssl rand -base64 32

# Edit .env and set:
# - DATABASE_URL (PostgreSQL connection)
# - NEXTAUTH_SECRET (paste the generated secret)
```

**Example .env:**
```env
DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/agentbay"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"
```

### Step 3: Setup Database

**Option A: Automatic**
```bash
make setup
```

**Option B: Manual**
```bash
# Create database
createdb agentbay

# Push schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Seed with sample data
npm run db:seed
```

### Step 4: Start the App

```bash
# Development mode
make dev

# Or
npm run dev
```

Visit **http://localhost:3000**

---

## 🐳 Docker Quick Start

If you prefer Docker or have network issues:

```bash
# 1. Start all services
make docker-up

# 2. Seed database (in container)
docker-compose exec app npx tsx prisma/seed.ts

# 3. View logs
make docker-logs
```

Visit **http://localhost:3000**

To stop:
```bash
make docker-down
```

---

## ✅ Verify Installation

Run this to check everything is working:

```bash
# Check all services
make check

# Or individually:
make lint        # Check code style
make type-check  # Check TypeScript
make test-ci     # Run tests
```

---

## 🎯 What You'll See

### Homepage (http://localhost:3000)
- Beautiful hero section
- Search bar
- Recent listings grid
- "How It Works" section

### Browse Page (http://localhost:3000/browse)
- All published listings
- Search functionality
- Filter by category
- Responsive grid layout

### Listing Detail (http://localhost:3000/listings/[id])
- Full listing information
- Images
- Price and condition
- Seller info
- Action buttons

### Create Listing (http://localhost:3000/listings/new)
- Complete form
- Category selection
- Condition picker
- Price input
- Location field

---

## 📊 Sample Data

After seeding, you'll have:

**Users:**
- alice@example.com (password: password123)
- bob@example.com (password: password123)

**Listings:**
1. Vintage Wooden Office Chair ($120)
2. Standing Desk - Adjustable Height ($350)
3. MacBook Pro 13-inch M1 ($800)
4. Mechanical Keyboard - Cherry MX Blue ($90)
5. Garden Tool Set ($45)
6. Professional Camera Tripod ($65)

---

## 🛠️ Available Commands

We provide both `make` commands and `npm` scripts:

### Development
```bash
make dev          # Start dev server
make build        # Build for production
make start        # Start production server
```

### Database
```bash
make db-studio    # Open Prisma Studio (DB GUI)
make db-push      # Push schema changes
make db-generate  # Regenerate Prisma Client
make db-seed      # Seed sample data
make db-reset     # Reset database (⚠️ deletes all)
```

### Testing
```bash
make test         # Run tests in watch mode
make test-ci      # Run tests once
make coverage     # Generate coverage report
```

### Docker
```bash
make docker-up       # Start services
make docker-down     # Stop services
make docker-logs     # View logs
make docker-shell    # Open shell in container
make docker-rebuild  # Rebuild images
```

### Utilities
```bash
make help         # Show all commands
make check        # Run all checks
make clean        # Clean build artifacts
```

---

## 🔧 Troubleshooting

### "Cannot connect to database"

**Solution:**
```bash
# 1. Ensure PostgreSQL is running
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# 2. Create the database
createdb agentbay

# 3. Check connection
psql -U postgres -h localhost -p 5432
```

### "npm install fails"

**Solution:**
```bash
# Try the automatic installer
./install.sh

# Or use Docker
make docker-up
```

### "Port 3000 already in use"

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
PORT=3001 npm run dev
```

### "Prisma Client not generated"

**Solution:**
```bash
npm run db:generate
```

### "Type errors after install"

**Solution:**
```bash
# Regenerate Prisma Client
npm run db:generate

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## 📖 Next Steps

Once you have AgentBay running:

1. **Explore the UI**
   - Browse listings
   - View listing details
   - Try creating a listing

2. **Open Prisma Studio**
   ```bash
   make db-studio
   ```
   View and edit database records visually

3. **Read the Documentation**
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System design
   - [ROADMAP.md](ROADMAP.md) - Development phases
   - [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Commands reference

4. **Start Phase 2**
   - Implement authentication
   - Build agent management UI
   - Integrate LLM for commands

---

## 🎓 Learning the Codebase

**Start with these files:**

1. `src/app/page.tsx` - Homepage
2. `src/app/browse/page.tsx` - Browse flow
3. `src/domain/listings/service.ts` - Business logic
4. `prisma/schema.prisma` - Database schema
5. `src/components/listing-card.tsx` - Component example

**Key concepts:**
- Domain layer handles business logic
- API routes in `src/app/api`
- Components in `src/components`
- Utilities in `src/lib`

---

## 💡 Tips

- Use `make help` to see all available commands
- Use `make db-studio` to visually browse the database
- Use `make test` while developing to catch errors early
- Check `QUICK_REFERENCE.md` for common tasks
- Read error messages carefully - they're helpful!

---

## 🆘 Getting Help

1. Check [INSTALLATION.md](INSTALLATION.md) for detailed setup
2. Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for commands
3. See [FILES_CREATED.txt](FILES_CREATED.txt) for project overview
4. Read [ARCHITECTURE.md](ARCHITECTURE.md) for design questions

---

## ✨ You're Ready!

You now have a fully functional AI-powered marketplace platform.

**Enjoy building with AgentBay!** 🚀

---

**Quick Commands Reference:**

```bash
./install.sh      # Install dependencies
make setup        # Complete setup
make dev          # Start development
make db-studio    # View database
make test         # Run tests
make help         # Show all commands
```
