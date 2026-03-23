// Skill registry - maps skill names to implementations
import type { ISkill } from "./types"

class SkillRegistry {
  private skills = new Map<string, ISkill>()

  /**
   * Register a skill implementation
   */
  register(skill: ISkill) {
    this.skills.set(skill.name, skill)
  }

  /**
   * Get a skill implementation by name
   */
  get(name: string): ISkill | undefined {
    return this.skills.get(name)
  }

  /**
   * Get all registered skills
   */
  getAll(): ISkill[] {
    return Array.from(this.skills.values())
  }

  /**
   * Check if a skill is registered
   */
  has(name: string): boolean {
    return this.skills.has(name)
  }

  /**
   * Unregister a skill
   */
  unregister(name: string): boolean {
    return this.skills.delete(name)
  }
}

// Export singleton instance
export const skillRegistry = new SkillRegistry()
