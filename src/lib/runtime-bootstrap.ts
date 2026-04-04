import { z } from "zod"

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
})

type RuntimeEnv = z.infer<typeof runtimeEnvSchema>

export interface RuntimeBootstrapResult {
  ok: boolean
  message: string
  missingEnv: string[]
  invalidEnv: string[]
  database: {
    checked: boolean
    connected: boolean
    error?: string
  }
  setupSteps: string[]
}

const setupSteps = [
  "Copy .env.example to .env and set DATABASE_URL, NEXTAUTH_URL, and NEXTAUTH_SECRET.",
  "Start PostgreSQL or docker compose before running buyer API probes.",
  "Run `npm run db:push` to apply the schema to the configured database.",
  "Run `npm run runtime:check` before starting QA heartbeats or route probes.",
]

let cachedResult:
  | {
      expiresAt: number
      fingerprint: string
      value: RuntimeBootstrapResult
    }
  | undefined

function getFingerprint() {
  return JSON.stringify({
    DATABASE_URL: process.env.DATABASE_URL ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? null,
  })
}

function getCachedResult() {
  if (
    cachedResult &&
    cachedResult.expiresAt > Date.now() &&
    cachedResult.fingerprint === getFingerprint()
  ) {
    return cachedResult.value
  }

  return null
}

function setCachedResult(value: RuntimeBootstrapResult) {
  cachedResult = {
    value,
    expiresAt: Date.now() + 5_000,
    fingerprint: getFingerprint(),
  }
}

function formatZodIssues(error: z.ZodError<RuntimeEnv>) {
  const missingEnv = new Set<string>()
  const invalidEnv = new Set<string>()

  for (const issue of error.issues) {
    const key = issue.path.join(".")

    if (
      issue.code === z.ZodIssueCode.invalid_type &&
      issue.received === "undefined"
    ) {
      missingEnv.add(key)
      continue
    }

    invalidEnv.add(key)
  }

  return {
    missingEnv: [...missingEnv],
    invalidEnv: [...invalidEnv],
  }
}

export function validateRuntimeEnv(): RuntimeBootstrapResult & { env?: RuntimeEnv } {
  const parsed = runtimeEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    const issues = formatZodIssues(parsed.error)

    return {
      ok: false,
      message:
        "AgentBay runtime bootstrap is incomplete. Required environment variables are missing or invalid.",
      ...issues,
      database: {
        checked: false,
        connected: false,
      },
      setupSteps,
    }
  }

  return {
    ok: true,
    message: "Runtime environment variables are configured.",
    env: parsed.data,
    missingEnv: [],
    invalidEnv: [],
    database: {
      checked: false,
      connected: false,
    },
    setupSteps,
  }
}

export async function checkRuntimeBootstrap(
  options?: { skipCache?: boolean }
): Promise<RuntimeBootstrapResult> {
  if (!options?.skipCache) {
    const cached = getCachedResult()
    if (cached) {
      return cached
    }
  }

  const envCheck = validateRuntimeEnv()
  if (!envCheck.ok) {
    setCachedResult(envCheck)
    return envCheck
  }

  try {
    const { db } = await import("@/lib/db")
    await db.$queryRawUnsafe("SELECT 1")

    const result: RuntimeBootstrapResult = {
      ok: true,
      message: "AgentBay runtime bootstrap is ready.",
      missingEnv: [],
      invalidEnv: [],
      database: {
        checked: true,
        connected: true,
      },
      setupSteps,
    }

    setCachedResult(result)
    return result
  } catch (error) {
    const result: RuntimeBootstrapResult = {
      ok: false,
      message:
        "AgentBay runtime bootstrap is incomplete. Database connectivity failed before buyer API handling could start.",
      missingEnv: [],
      invalidEnv: [],
      database: {
        checked: true,
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      },
      setupSteps,
    }

    setCachedResult(result)
    return result
  }
}
