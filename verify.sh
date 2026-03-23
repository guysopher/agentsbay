#!/bin/bash

# AgentBay Verification Script
# Checks if everything is set up correctly

set +e  # Don't exit on error

echo "🔍 AgentBay Verification Script"
echo "==============================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# Check function
check() {
    local name=$1
    local command=$2

    echo -ne "${BLUE}Checking ${name}...${NC} "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

# Warning check
warn() {
    local name=$1
    local command=$2

    echo -ne "${BLUE}Checking ${name}...${NC} "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC}"
        ((WARN++))
        return 1
    fi
}

echo "System Requirements"
echo "-------------------"
check "Node.js" "command -v node"
check "npm" "command -v npm"
warn "PostgreSQL" "command -v psql"
warn "Docker" "command -v docker"
warn "Make" "command -v make"
echo ""

echo "Project Files"
echo "-------------"
check "package.json" "test -f package.json"
check "Prisma schema" "test -f prisma/schema.prisma"
check ".env.example" "test -f .env.example"
check "tsconfig.json" "test -f tsconfig.json"
echo ""

echo "Installation"
echo "------------"
check "node_modules" "test -d node_modules"
check "Prisma Client" "test -d node_modules/.prisma/client || test -d node_modules/@prisma/client"
warn ".env file" "test -f .env"
echo ""

if [ -f .env ]; then
    source .env 2>/dev/null || true

    echo "Environment Variables"
    echo "---------------------"
    warn "DATABASE_URL" "test -n '$DATABASE_URL'"
    warn "NEXTAUTH_SECRET" "test -n '$NEXTAUTH_SECRET'"
    warn "NEXTAUTH_URL" "test -n '$NEXTAUTH_URL'"
    echo ""
fi

echo "Build Status"
echo "------------"
if [ -d "node_modules" ]; then
    check "TypeScript compilation" "npx tsc --noEmit"
    warn "Next.js build" "test -d .next || npm run build"
else
    echo -e "${YELLOW}⚠ Skipping build checks (node_modules not found)${NC}"
    ((WARN++))
fi
echo ""

echo "Database"
echo "--------"
if [ -n "$DATABASE_URL" ]; then
    check "Database connection" "npx prisma db execute --stdin <<< 'SELECT 1' 2>/dev/null"
else
    echo -e "${YELLOW}⚠ DATABASE_URL not set, skipping database checks${NC}"
    ((WARN++))
fi
echo ""

# Summary
echo "==============================="
echo "Summary"
echo "==============================="
echo -e "${GREEN}Passed: ${PASS}${NC}"
echo -e "${YELLOW}Warnings: ${WARN}${NC}"
echo -e "${RED}Failed: ${FAIL}${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Some checks failed!${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Run: ./install.sh"
    echo "  - Run: make setup"
    echo "  - Check .env file exists and has correct values"
    echo ""
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}Setup incomplete but core requirements met${NC}"
    echo ""
    echo "To complete setup:"
    echo "  1. Create .env: cp .env.example .env"
    echo "  2. Edit .env with your DATABASE_URL"
    echo "  3. Run: make setup"
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ All checks passed! AgentBay is ready to run!${NC}"
    echo ""
    echo "Start the app with:"
    echo "  make dev"
    echo ""
    echo "Or use the quick start script:"
    echo "  ./start.sh"
    echo ""
    exit 0
fi
