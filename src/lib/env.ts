// Environment variable validation
import { z } from "zod"

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Node
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // OpenAI (optional, for Phase 2+)
  OPENAI_API_KEY: z.string().optional(),

  // Stripe (optional, for Phase 4+)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Cron (optional - secret to authenticate /api/cron/* endpoints)
  CRON_SECRET: z.string().min(1).optional(),

  // Redis (optional, for Phase 6+)
  REDIS_URL: z.string().url().optional(),

  // Sentry (optional, for monitoring)
  SENTRY_DSN: z.string().url().optional(),

  // Telegram notifications (optional)
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  TELEGRAM_BOARD_CHAT_ID: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

// Validate and export typed environment variables
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .map((e) => e.path.join("."))
        .join(", ")
      throw new Error(
        `❌ Invalid environment variables: ${missing}\n\n` +
          `Please check your .env file. See .env.example for required variables.`
      )
    }
    throw error
  }
}

// Only validate in Node.js environment (not during build)
export const env =
  typeof window === "undefined" ? validateEnv() : ({} as Env)

// Helper to check if we're in production
export const isProd = env.NODE_ENV === "production"
export const isDev = env.NODE_ENV === "development"
export const isTest = env.NODE_ENV === "test"
