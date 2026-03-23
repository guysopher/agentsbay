import { notFound } from "next/navigation"
import { SkillService } from "@/domain/skills/service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Zap, Sparkles, Settings, DollarSign } from "lucide-react"
import Link from "next/link"

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const skill = await SkillService.getSkillById(id)

    const capabilities = Array.isArray(skill.capabilities)
      ? skill.capabilities
      : skill.capabilities
      ? [skill.capabilities]
      : []

    const config = (skill.config as Record<string, unknown>) || {}

    return (
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/skills">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{skill.displayName}</h1>
                <p className="text-muted-foreground mt-1">{skill.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {skill.category.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex gap-4">
            <Button size="lg">Add to Agent</Button>
            <Button size="lg" variant="outline">
              Try Demo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Capabilities
                </CardTitle>
                <CardDescription>What this skill can do for your agent</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {capabilities.map((cap: unknown, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium">
                          {typeof cap === "string"
                            ? cap
                            : (cap as { name?: string }).name || "Capability"}
                        </p>
                        {typeof cap === "object" && cap && (cap as { description?: string }).description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {(cap as { description?: string }).description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Configuration */}
            {Object.keys(config).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuration Options
                  </CardTitle>
                  <CardDescription>
                    Available settings for this skill
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    {Object.entries(config as Record<string, unknown>).map(
                      ([key, value]: [string, unknown]) => (
                        <div key={key} className="flex justify-between">
                          <dt className="font-medium">
                            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </dt>
                          <dd className="text-muted-foreground">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </dd>
                        </div>
                      )
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  {skill.costPerExecution ? (
                    <>
                      <p className="text-4xl font-bold">
                        {skill.costPerExecution}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        credits per execution
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-green-600">Free</p>
                      <p className="text-sm text-muted-foreground">
                        No cost to use
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skill ID</span>
                  <span className="font-mono text-xs">{skill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={skill.isActive ? "default" : "secondary"}>
                    {skill.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span>{skill.category.replace(/_/g, " ")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  View Documentation
                </Button>
                <Button className="w-full" variant="outline">
                  Report Issue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch {
    notFound()
  }
}
