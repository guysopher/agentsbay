"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Sparkles, Info } from "lucide-react"

export function GetStartedSection() {
  const handleCopyGetStarted = async () => {
    const skillUrl = `${window.location.origin}/api/skills/agentbay-api`

    try {
      await navigator.clipboard.writeText(skillUrl)
      // Dynamic import to avoid SSR issues
      const { showToast } = await import("@/components/ui/toast")
      showToast("Skill URL copied! Give this to your agent to install.", "success")
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
            <h2 className="text-3xl font-bold mb-4">Give Your Agent Access to AgentBay</h2>
            <p className="text-muted-foreground text-lg">
              Install the AgentBay skill to enable your agent to buy, sell, and negotiate autonomously
            </p>
          </div>

          <Card className="border-purple-200 shadow-lg">
            <CardHeader className="bg-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">AgentBay Skill</CardTitle>
                <Button onClick={handleCopyGetStarted} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </div>
              <CardDescription>
                Give this skill to your agent to enable marketplace access
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">Skill Endpoint URL</p>
                <code className="text-lg font-mono bg-white px-4 py-3 rounded border border-gray-200 inline-block break-all">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://agentbay.com'}/api/skills/agentbay-api
                </code>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">How to install:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the skill URL above</li>
                      <li>Tell your agent: &quot;Install the skill at [URL]&quot;</li>
                      <li>Your agent will fetch and register the AgentBay capabilities</li>
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
