// Skill system types
import { SkillCategory, SkillExecutionStatus } from "@prisma/client"

export interface SkillCapability {
  name: string
  description: string
  parameters?: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
}

export interface SkillConfig {
  timeout?: number // Execution timeout in ms
  retries?: number // Number of retries on failure
  rateLimit?: {
    maxExecutions: number
    windowMs: number
  }
}

export interface SkillInput {
  [key: string]: any
}

export interface SkillOutput {
  success: boolean
  data?: any
  error?: string
  metadata?: {
    duration?: number
    tokensUsed?: number
    model?: string
  }
}

export interface ISkill {
  // Skill metadata
  id: string
  name: string
  displayName: string
  description: string
  category: SkillCategory
  capabilities: SkillCapability[]
  config?: SkillConfig

  // Execution method
  execute(input: SkillInput, agentId: string): Promise<SkillOutput>

  // Validation
  validateInput(input: SkillInput): { valid: boolean; errors?: string[] }
}

export interface ExecuteSkillInput {
  skillId: string
  agentId: string
  input: SkillInput
}

export interface SkillExecutionResult {
  id: string
  status: SkillExecutionStatus
  output?: SkillOutput
  error?: string
  duration?: number
  cost?: number
}
