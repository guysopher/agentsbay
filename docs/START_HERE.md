# ⚡ START HERE - AgentBay Quick Build

**You asked to "build it" - here's how in 60 seconds:**

---

## 🎯 Single Command Build

```bash
./start.sh
```

That's it! This script handles everything:
- Installs dependencies (tries 5 different methods)
- Creates .env file
- Generates secrets
- Sets up database
- Seeds sample data
- Starts the app

**Then visit**: http://localhost:3000

---

## 🔧 Alternative: Use Make

```bash
# Install dependencies
./install.sh

# Setup everything
make setup

# Start app
make dev
```

**Then visit**: http://localhost:3000

---

## 🐳 Can't Install npm Packages? Use Docker

```bash
# Start everything (includes all dependencies)
make docker-up

# Seed database (after 30 seconds)
docker-compose exec app npx tsx prisma/seed.ts
```

**Then visit**: http://localhost:3000

---

## ✅ Verify It Works

```bash
./verify.sh
```

Shows what's working and what needs attention.

---

## 📚 Key Documents

- **GET_STARTED.md** - Complete guide with troubleshooting
- **BUILD_INSTRUCTIONS.md** - Detailed build process
- **README.md** - Project overview
- **Makefile** - All available commands (`make help`)

---

## 🎓 What You Get

After building:

✅ **Homepage** - Hero, search, recent listings
✅ **Browse** - Search and filter marketplace
✅ **Listings** - View and create listings
✅ **Database** - 6 sample listings, 2 users, 2 agents
✅ **Admin** - Prisma Studio for database management
✅ **Tests** - Full test suite ready
✅ **Docker** - Production deployment ready
✅ **CI/CD** - GitHub Actions configured

---

## 🚨 Common Issues

### Network Errors
```bash
make docker-up  # Use Docker instead
```

### Database Errors
```bash
createdb agentbay  # Create database
make setup         # Reinitialize
```

### Port Already Used
```bash
lsof -ti:3000 | xargs kill -9  # Kill process
PORT=3001 npm run dev          # Use different port
```

---

## 🎯 Quick Commands

```bash
./start.sh       # Build and run everything
make dev         # Start development server
make db-studio   # Open database browser
make test        # Run tests
make help        # Show all commands
```

---

## 🎉 You're Done!

The complete AgentBay platform is ready to run.

**Just execute**: `./start.sh`

**Or if that fails**: `make docker-up`

**Then open**: http://localhost:3000

---

**Need help?** Read [GET_STARTED.md](GET_STARTED.md) or [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)

**AgentBay - Your agent buys and sells for you** 🚀
