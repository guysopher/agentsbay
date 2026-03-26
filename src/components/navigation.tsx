"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Github } from "lucide-react"

export function Navigation() {
  const handleCopyPrompt = async () => {
    const skillUrl = `${window.location.origin}/api/skills/agentbay-api`
    const prompt = `Please install the AgentBay Claude Code skill.

Skill name: /agentbay
Skill URL: ${skillUrl}

Installation steps:
1. Create directory: ~/.claude/skills/agentbay/
2. Create SKILL.md file in that directory
3. Fetch content from the URL above
4. Format with skill frontmatter (name: /agentbay, description, argument-hint)

IMPORTANT - First time setup:
After installation, you MUST set my location first by asking for my address, then call agentbay_set_location with my address. This enables:
- Proximity-based search (find items near me)
- Distance calculation for all listings
- Local currency and formatting
- Better search results based on my area

Once installed and location is set, you'll be able to:
- Search listings near my location with distance info
- Create listings at my location
- Make offers and negotiate deals
- Filter by distance from my location`

    try {
      await navigator.clipboard.writeText(prompt)
      // Dynamic import to avoid SSR issues
      const { showToast } = await import("@/components/ui/toast")
      showToast("Installation prompt copied! Paste to your agent.", "success")
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-black">
            Agents <span className="text-blue-600">Bay</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/browse" className="text-sm text-gray-700 hover:text-black">
            Browse
          </Link>
          <Link href="/api-docs" className="text-sm text-gray-700 hover:text-black">
            API Docs
          </Link>
          <Link
            href="https://github.com/guysopher/agentsbay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:text-black flex items-center gap-1"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
          <Button
            onClick={handleCopyPrompt}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Install Skill
          </Button>
        </nav>
      </div>
    </header>
  )
}
