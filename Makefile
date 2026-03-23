# AgentBay Makefile
# Convenient commands for development

.PHONY: help install setup dev build test clean docker-up docker-down

help: ## Show this help message
	@echo "AgentBay - Available Commands"
	@echo "=============================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@./install.sh

setup: install ## Complete setup (install + db setup + seed)
	@echo "🔧 Setting up environment..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file"; \
		echo "⚠️  Please edit .env with your DATABASE_URL"; \
	fi
	@echo "🗄️  Setting up database..."
	@npm run db:push
	@npm run db:generate
	@npm run db:seed
	@echo "✓ Setup complete!"

dev: ## Start development server
	@echo "🚀 Starting development server..."
	@npm run dev

build: ## Build for production
	@echo "🏗️  Building for production..."
	@npm run build

start: ## Start production server
	@echo "▶️  Starting production server..."
	@npm start

test: ## Run tests
	@echo "🧪 Running tests..."
	@npm test

test-ci: ## Run tests in CI mode
	@echo "🧪 Running tests (CI)..."
	@npm run test:ci

coverage: ## Generate test coverage
	@echo "📊 Generating coverage report..."
	@npm run test:coverage

lint: ## Run linter
	@echo "🔍 Linting code..."
	@npm run lint

type-check: ## Run TypeScript type checking
	@echo "🔍 Type checking..."
	@npm run type-check

db-studio: ## Open Prisma Studio
	@echo "🎨 Opening Prisma Studio..."
	@npm run db:studio

db-push: ## Push schema to database
	@echo "⬆️  Pushing schema to database..."
	@npm run db:push

db-generate: ## Generate Prisma Client
	@echo "🔧 Generating Prisma Client..."
	@npm run db:generate

db-seed: ## Seed database
	@echo "🌱 Seeding database..."
	@npm run db:seed

db-reset: ## Reset database (⚠️  deletes all data)
	@echo "⚠️  Resetting database..."
	@read -p "Are you sure? (y/n) " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		npm run db:reset; \
	fi

docker-up: ## Start Docker services
	@echo "🐳 Starting Docker services..."
	@docker-compose up -d
	@echo "✓ Services started"
	@echo "  - App: http://localhost:3000"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"

docker-down: ## Stop Docker services
	@echo "🐳 Stopping Docker services..."
	@docker-compose down

docker-logs: ## View Docker logs
	@docker-compose logs -f app

docker-shell: ## Open shell in Docker container
	@docker-compose exec app sh

docker-rebuild: ## Rebuild Docker images
	@echo "🐳 Rebuilding Docker images..."
	@docker-compose build --no-cache

clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning..."
	@rm -rf node_modules
	@rm -rf .next
	@rm -rf dist
	@rm -rf coverage
	@rm -f package-lock.json
	@rm -f yarn.lock
	@rm -f pnpm-lock.yaml
	@echo "✓ Cleaned"

logs: ## View application logs (dev)
	@tail -f .next/*.log 2>/dev/null || echo "No logs found. Run 'make dev' first."

check: lint type-check test-ci ## Run all checks (lint + type-check + tests)
	@echo "✅ All checks passed!"

quick-start: ## Quick start (for first time)
	@./start.sh

.DEFAULT_GOAL := help
