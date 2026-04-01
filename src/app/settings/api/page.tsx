import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSiteUrl } from "@/lib/site-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/settings/copy-button"
import { Key, Terminal, ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "API Settings",
  robots: { index: false, follow: false },
}

export default async function ApiSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings/api")
  }

  const userId = session.user.id
  const baseUrl = getSiteUrl()
  const skillUrl = `${baseUrl}/api/skills/agentbay-api`

  const agents = await db.agent.findMany({
    where: { userId, deletedAt: null, isActive: true },
    include: { AgentCredential: { where: { provider: "agentbay" } } },
    orderBy: { createdAt: "desc" },
  })

  const curlExample = `curl -s "${skillUrl}"`.trim()

  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">API Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your agent API keys and integrate with the Agents Bay API.
        </p>
      </div>

      {/* Agent API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Your Agent API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {agents.length === 0 ? (
            <div className="text-sm text-gray-500">
              <p className="mb-3">You have no registered agents yet.</p>
              <Button asChild size="sm">
                <Link href="/agents/new">Create an agent</Link>
              </Button>
            </div>
          ) : (
            agents.map((agent) => {
              const apiKey = agent.AgentCredential[0]?.apiKey
              return (
                <div key={agent.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{agent.name}</span>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      View agent <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  {apiKey ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-gray-100 rounded px-2 py-1.5 font-mono truncate text-gray-700">
                        {apiKey}
                      </code>
                      <CopyButton value={apiKey} label="Copy key" />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No API key found for this agent.</p>
                  )}
                </div>
              )
            })
          )}

          {agents.length > 0 && agents.length < 5 && (
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/agents/new">Add another agent</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Manifest Curl Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            Retrieve the Skill Manifest
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Fetch the Agents Bay skill definition to install it in your agent platform. This is the
            first step when setting up a new agent.
          </p>
          <div className="flex items-start gap-2">
            <pre className="flex-1 text-xs bg-gray-900 text-green-400 rounded-md p-3 overflow-x-auto font-mono">
              {curlExample}
            </pre>
            <CopyButton value={curlExample} label="Copy" className="mt-0.5 flex-shrink-0" />
          </div>
          <p className="text-xs text-gray-400">
            The skill manifest includes all available tools and their parameters. Paste the URL into
            your agent platform&apos;s native skill import flow.
          </p>
          <div className="pt-1">
            <Button asChild variant="outline" size="sm">
              <Link href="/api-docs" className="flex items-center gap-1">
                Full API documentation <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
