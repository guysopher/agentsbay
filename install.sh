#!/bin/bash

# AgentBay Installation Script
# Tries multiple methods to install dependencies

set -e

echo "🔧 AgentBay Installation Script"
echo "==============================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check internet connectivity
check_internet() {
    echo -e "${BLUE}Checking internet connectivity...${NC}"
    if curl -s --head --max-time 5 https://www.google.com > /dev/null; then
        echo -e "${GREEN}✓ Internet connection OK${NC}"
        return 0
    else
        echo -e "${RED}✗ No internet connection${NC}"
        return 1
    fi
}

# Function to check npm registry access
check_npm_registry() {
    echo -e "${BLUE}Checking npm registry access...${NC}"
    if curl -s --head --max-time 5 https://registry.npmjs.org > /dev/null; then
        echo -e "${GREEN}✓ npm registry accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ Cannot reach npm registry${NC}"
        return 1
    fi
}

# Method 1: Standard npm install
install_with_npm() {
    echo ""
    echo -e "${YELLOW}Method 1: Standard npm install${NC}"
    if npm install; then
        echo -e "${GREEN}✓ Success with npm${NC}"
        return 0
    fi
    return 1
}

# Method 2: npm with legacy peer deps
install_with_npm_legacy() {
    echo ""
    echo -e "${YELLOW}Method 2: npm with legacy peer deps${NC}"
    if npm install --legacy-peer-deps; then
        echo -e "${GREEN}✓ Success with npm --legacy-peer-deps${NC}"
        return 0
    fi
    return 1
}

# Method 3: Clean install
install_with_clean() {
    echo ""
    echo -e "${YELLOW}Method 3: Clean install${NC}"
    echo "Cleaning npm cache..."
    npm cache clean --force
    rm -rf node_modules package-lock.json
    if npm install --legacy-peer-deps; then
        echo -e "${GREEN}✓ Success with clean install${NC}"
        return 0
    fi
    return 1
}

# Method 4: Yarn
install_with_yarn() {
    echo ""
    echo -e "${YELLOW}Method 4: Trying yarn${NC}"
    if command -v yarn &> /dev/null; then
        if yarn install; then
            echo -e "${GREEN}✓ Success with yarn${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}Yarn not installed, skipping${NC}"
    fi
    return 1
}

# Method 5: pnpm
install_with_pnpm() {
    echo ""
    echo -e "${YELLOW}Method 5: Trying pnpm${NC}"
    if command -v pnpm &> /dev/null; then
        if pnpm install; then
            echo -e "${GREEN}✓ Success with pnpm${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}pnpm not installed, skipping${NC}"
    fi
    return 1
}

# Check if already installed
if [ -d "node_modules" ] && [ -d "node_modules/.prisma" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
    echo ""
    read -p "Reinstall? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Run checks
check_internet || {
    echo ""
    echo -e "${RED}Cannot proceed without internet connection${NC}"
    echo "Please check your network settings"
    exit 1
}

check_npm_registry || {
    echo ""
    echo -e "${YELLOW}npm registry not accessible${NC}"
    echo "This might be due to:"
    echo "  - Firewall blocking port 443"
    echo "  - Corporate proxy"
    echo "  - VPN interference"
    echo ""
    echo "Trying alternative installation methods..."
}

# Try installation methods in order
install_with_npm || \
install_with_npm_legacy || \
install_with_yarn || \
install_with_pnpm || \
install_with_clean || {
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}All installation methods failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Possible solutions:"
    echo ""
    echo "1. Configure npm proxy (if behind corporate firewall):"
    echo "   npm config set proxy http://proxy.company.com:8080"
    echo "   npm config set https-proxy http://proxy.company.com:8080"
    echo ""
    echo "2. Use different registry:"
    echo "   npm config set registry https://registry.npmmirror.com/"
    echo ""
    echo "3. Use Docker (includes all dependencies):"
    echo "   docker-compose up -d"
    echo ""
    echo "4. Try on a different network"
    echo ""
    exit 1
}

# Success!
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation successful! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Setup environment:"
echo "   cp .env.example .env"
echo "   # Edit .env with your database URL"
echo ""
echo "2. Initialize database:"
echo "   npm run db:push"
echo "   npm run db:generate"
echo "   npm run db:seed"
echo ""
echo "3. Start the app:"
echo "   npm run dev"
echo ""
echo "Or simply run:"
echo "   ./start.sh"
echo ""
