#!/bin/bash

# AgentBay Startup Script
# This script will set up and start AgentBay

set -e  # Exit on error

echo "🚀 AgentBay Startup Script"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env

    # Generate NEXTAUTH_SECRET
    if command -v openssl &> /dev/null; then
        SECRET=$(openssl rand -base64 32)
        # Replace the placeholder in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-secret-key-here-change-in-production/$SECRET/" .env
        else
            # Linux
            sed -i "s/your-secret-key-here-change-in-production/$SECRET/" .env
        fi
        echo -e "${GREEN}✓ Generated NEXTAUTH_SECRET${NC}"
    fi

    echo -e "${YELLOW}⚠️  Please edit .env file with your DATABASE_URL${NC}"
    echo ""
fi

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    echo ""

    # Try npm first
    if npm install; then
        echo -e "${GREEN}✓ Dependencies installed with npm${NC}"
    else
        echo -e "${RED}✗ npm install failed. Trying yarn...${NC}"

        # Try yarn
        if command -v yarn &> /dev/null; then
            if yarn install; then
                echo -e "${GREEN}✓ Dependencies installed with yarn${NC}"
            else
                echo -e "${RED}✗ Installation failed!${NC}"
                echo ""
                echo "Please try one of these solutions:"
                echo "1. Check your network connection"
                echo "2. Set npm proxy: npm config set proxy http://proxy:port"
                echo "3. Use Docker: npm run docker:up"
                echo ""
                exit 1
            fi
        else
            echo -e "${RED}✗ Installation failed and yarn not available${NC}"
            echo ""
            echo "Please install dependencies manually:"
            echo "  npm install --legacy-peer-deps"
            echo ""
            exit 1
        fi
    fi
    echo ""
fi

# Check if Prisma Client is generated
if [ ! -d "node_modules/.prisma/client" ]; then
    echo -e "${YELLOW}🔧 Generating Prisma Client...${NC}"
    npm run db:generate
    echo -e "${GREEN}✓ Prisma Client generated${NC}"
    echo ""
fi

# Check database connection
echo -e "${YELLOW}🔍 Checking database connection...${NC}"
source .env 2>/dev/null || true

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not set in .env${NC}"
    echo ""
    echo "Please set DATABASE_URL in .env file:"
    echo "  DATABASE_URL=\"postgresql://user:password@localhost:5432/agentbay\""
    echo ""
    exit 1
fi

# Try to connect to database
if npm run db:push --preview-feature &> /dev/null; then
    echo -e "${GREEN}✓ Database connected${NC}"
    echo ""

    # Ask about seeding
    read -p "Seed database with sample data? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🌱 Seeding database...${NC}"
        npm run db:seed
        echo -e "${GREEN}✓ Database seeded${NC}"
        echo ""
    fi
else
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo ""
    echo "Make sure PostgreSQL is running and DATABASE_URL is correct."
    echo ""
    echo "Create database with:"
    echo "  createdb agentbay"
    echo ""
    exit 1
fi

# Start the application
echo -e "${GREEN}✨ Starting AgentBay...${NC}"
echo ""
echo "The app will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev
