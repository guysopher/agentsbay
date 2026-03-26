# AgentBay - Quick Reference

## 🚀 Getting Started

```bash
# Install dependencies (after fixing network)
npm install

# Setup database
cp .env.example .env
# Edit .env with your DATABASE_URL

# Initialize database
npm run db:push
npm run db:generate
npm run db:seed

# Run development server
npm run dev
```

## 📁 Project Structure

```
src/
├── app/              # Pages and API routes
├── components/       # React components
├── domain/          # Business logic (service layer)
├── lib/             # Utilities (db, auth, helpers)
└── types/           # TypeScript types

prisma/
├── schema.prisma    # Database schema
└── seed.ts          # Seed data script
```

## 🗄️ Database Commands

```bash
npm run db:studio      # Open Prisma Studio
npm run db:generate    # Regenerate Prisma Client
npm run db:push        # Push schema changes to DB
npm run db:seed        # Seed database
npm run db:reset       # ⚠️  Reset DB (deletes all data)
```

## 🔑 Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agentbay"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[run: openssl rand -base64 32]"
OPENAI_API_KEY=""  # For Phase 2+
```

## 🎨 UI Components

Located in `src/components/ui/`:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
```

## 📊 Database Models

Key models in Prisma:

```prisma
User          # Authentication & profile
Agent         # AI agent configuration
Listing       # Items for sale
NegotiationThread  # Buyer-seller conversation
Bid           # Offers and counteroffers
Order         # Transaction after accepted bid
AuditLog      # Action tracking
```

## 🔧 Domain Services

### Listings Service

```typescript
import { ListingService } from "@/domain/listings/service"

// Create listing
const listing = await ListingService.create(userId, {
  title: "Office Chair",
  description: "Great condition",
  category: "FURNITURE",
  condition: "GOOD",
  price: 10000, // in cents
  location: "San Francisco, CA"
})

// Search listings
const results = await ListingService.search({
  query: "chair",
  category: "FURNITURE",
  minPrice: 5000,
  maxPrice: 20000
})

// Get by ID
const listing = await ListingService.getById(id)

// Publish listing
await ListingService.publish(listingId, userId)
```

## 🌐 API Routes

### Listings

```bash
GET  /api/listings              # Search/filter
POST /api/listings              # Create
GET  /api/listings/[id]         # Get details
PATCH /api/listings/[id]        # Update
DELETE /api/listings/[id]       # Delete
```

### Auth

```bash
POST /api/auth/signin
POST /api/auth/signup
POST /api/auth/signout
GET  /api/auth/session
```

## 🧪 Test Data

After seeding:

**Users:**
- alice@example.com / password123
- bob@example.com / password123

**Listings:**
- Office chair ($120)
- Standing desk ($350)
- MacBook Pro ($800)
- Mechanical keyboard ($90)
- Garden tools ($45)
- Camera tripod ($65)

## 🎯 Common Tasks

### Add a New Page

```bash
# Create page file
touch src/app/my-page/page.tsx
```

```tsx
// src/app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page</div>
}
```

### Create API Route

```bash
# Create API file
mkdir -p src/app/api/my-endpoint
touch src/app/api/my-endpoint/route.ts
```

```typescript
// src/app/api/my-endpoint/route.ts
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return NextResponse.json({ message: "Hello" })
}

export async function POST(request: Request) {
  const body = await request.json()
  // Process body
  return NextResponse.json({ success: true })
}
```

### Add Database Model

1. Edit `prisma/schema.prisma`:

```prisma
model MyModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

2. Push to database:

```bash
npm run db:push
npm run db:generate
```

### Create New Component

```tsx
// src/components/my-component.tsx
interface MyComponentProps {
  title: string
  children: React.ReactNode
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
```

### Add Domain Service

```typescript
// src/domain/my-feature/service.ts
import { db } from "@/lib/db"

export class MyService {
  static async create(data: any) {
    return db.myModel.create({ data })
  }

  static async getAll() {
    return db.myModel.findMany()
  }
}
```

### Add Validation Schema

```typescript
// src/domain/my-feature/validation.ts
import { z } from "zod"

export const mySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  age: z.number().int().positive().optional(),
})

export type MyInput = z.infer<typeof mySchema>
```

## 🔍 Debugging

### Check Database

```bash
npm run db:studio
```

### View Logs

```bash
# Development server logs
npm run dev

# Database query logs
# Enable in prisma/schema.prisma:
# log = ["query", "info", "warn", "error"]
```

### TypeScript Errors

```bash
# Check types
npx tsc --noEmit

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## 📝 Code Style

### Naming Conventions

- **Components**: PascalCase (`ListingCard.tsx`)
- **Functions**: camelCase (`formatPrice()`)
- **Files**: kebab-case (`listing-card.tsx`)
- **Database models**: PascalCase (`User`, `Listing`)
- **API routes**: lowercase folders (`/api/listings`)

### Import Order

```typescript
// 1. React and Next.js
import { useState } from "react"
import Link from "next/link"

// 2. External libraries
import { z } from "zod"

// 3. Internal modules
import { db } from "@/lib/db"
import { ListingService } from "@/domain/listings/service"

// 4. Components
import { Button } from "@/components/ui/button"

// 5. Types
import type { Listing } from "@prisma/client"
```

## 🚨 Common Errors

### "Cannot find module '@prisma/client'"

```bash
npm run db:generate
```

### "Database connection error"

Check `.env` file has correct `DATABASE_URL`

### "Module not found: Can't resolve '@/...'"

Ensure `tsconfig.json` has correct paths configuration

### "NEXTAUTH_SECRET not set"

Add to `.env`:
```bash
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

## 🎓 Learning Resources

### Prisma
- Docs: https://www.prisma.io/docs
- Schema reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

### Next.js
- Docs: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app

### NextAuth.js
- Docs: https://next-auth.js.org
- V5 Docs: https://authjs.dev

### Zod
- Docs: https://zod.dev
- GitHub: https://github.com/colinhacks/zod

## 📦 Package Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint src create-listing.ts --max-warnings=0",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset --force"
}
```

## 🔗 Useful Links

- **Prisma Studio**: http://localhost:5555 (after `npm run db:studio`)
- **Dev Server**: http://localhost:3000 (after `npm run dev`)
- **API Routes**: http://localhost:3000/api/*

---

**Keep this file handy for quick reference during development!**
