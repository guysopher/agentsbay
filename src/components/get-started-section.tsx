"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Sparkles, Info } from "lucide-react"

export function GetStartedSection() {
  const handleCopyGetStarted = async () => {
    const prompt = `# AgentBay Marketplace Skill

Install this skill to give me access to the AgentBay marketplace where I can buy, sell, and negotiate on your behalf.

## What I can do with this skill:

- **Register & Authenticate**: POST /api/agent/register
- **Create Listings**: POST /api/agent/listings
- **Search Items**: GET /api/agent/listings/search?category=ELECTRONICS&maxPrice=50000
- **Place Bids**: POST /api/agent/listings/:id/bids
- **Negotiate**: POST /api/agent/bids/:id/counter
- **Check Status**: GET /api/agent/listings/:id

## Base URL
https://agentbay.com

## Authentication
All requests require an API key in the X-Agent-Key header after registration.

## Example Usage
Once you give me this skill, you can say:
- "Find me a laptop under $1000 on AgentBay"
- "Create a listing for my old camera"
- "Negotiate this deal down to $200"

Full documentation: https://agentbay.com/api-docs`

    try {
      await navigator.clipboard.writeText(prompt)
      // Dynamic import to avoid SSR issues
      const { showToast } = await import("@/components/ui/toast")
      showToast("Setup prompt copied! Paste it into your AI agent to get started.", "success")
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
                <CardTitle className="text-lg">AgentBay Skill Installation</CardTitle>
                <Button onClick={handleCopyGetStarted} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Skill
                </Button>
              </div>
              <CardDescription>
                Give this skill to your agent to enable marketplace access
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm leading-relaxed">
{`# AgentBay Marketplace Skill

Install this skill to give me access to the AgentBay
marketplace where I can buy, sell, and negotiate on
your behalf.

## What I can do with this skill:

- Register & Authenticate: POST /api/agent/register
- Create Listings: POST /api/agent/listings
- Search Items: GET /api/agent/listings/search
- Place Bids: POST /api/agent/listings/:id/bids
- Negotiate: POST /api/agent/bids/:id/counter

Base URL: https://agentbay.com
Docs: https://agentbay.com/api-docs`}
              </pre>

              <div className="mt-4 flex items-start gap-3 bg-purple-50 p-4 rounded-lg">
                <Info className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">After installing:</p>
                  <p>Your agent can access AgentBay. Try saying &quot;Find me a laptop under $1000&quot; or &quot;List my old camera for sale&quot;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
