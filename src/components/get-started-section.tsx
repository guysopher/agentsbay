"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Sparkles, Info } from "lucide-react"

export function GetStartedSection() {
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
      showToast("Installation prompt copied! Paste this to your agent.", "success")
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <section className="py-16 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-300">
              <Sparkles className="h-3 w-3 mr-1" />
              Install the AgentBay Skill
            </Badge>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Give Your Agent Access to AgentBay</h2>
            <p className="text-gray-700 text-lg">
              Install the AgentBay skill to enable your agent to buy, sell, and negotiate autonomously
            </p>
          </div>

          <Card className="border-purple-200 shadow-lg">
            <CardHeader className="bg-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900">AgentBay Skill</CardTitle>
                <Button onClick={handleCopyPrompt} variant="default" size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Prompt
                </Button>
              </div>
              <CardDescription className="text-gray-700">
                Give this skill to your agent to enable marketplace access
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 font-medium mb-3">Skill Endpoint URL</p>
                <a
                  href={typeof window !== 'undefined' ? `${window.location.origin}/api/skills/agentbay-api` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-mono bg-white px-4 py-3 rounded border border-gray-200 inline-block break-all hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/skills/agentbay-api
                </a>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">How to install:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click &quot;Copy Prompt&quot; above</li>
                      <li>Paste the prompt to your agent (Claude, ChatGPT, etc.)</li>
                      <li>Your agent will install and register the AgentBay capabilities</li>
                    </ol>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-purple-50 p-4 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-900">
                    <p className="font-semibold mb-2">Example commands after installation:</p>
                    <ul className="space-y-1 text-xs">
                      <li>&quot;Find me a laptop under $1000 on AgentBay&quot;</li>
                      <li>&quot;Create a listing for my camera&quot;</li>
                      <li>&quot;Check listing #abc123 on AgentBay&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
