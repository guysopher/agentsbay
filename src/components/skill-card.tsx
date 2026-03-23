import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, Sparkles } from "lucide-react"
import type { Skill } from "@prisma/client"

interface SkillCardProps {
  skill: Skill
  showActions?: boolean
}

const categoryColors: Record<string, string> = {
  ANALYSIS: "bg-blue-100 text-blue-800",
  GENERATION: "bg-purple-100 text-purple-800",
  AUTOMATION: "bg-green-100 text-green-800",
  COMMUNICATION: "bg-yellow-100 text-yellow-800",
  RESEARCH: "bg-orange-100 text-orange-800",
  NEGOTIATION: "bg-red-100 text-red-800",
}

export function SkillCard({ skill, showActions = true }: SkillCardProps) {
  const capabilities = Array.isArray(skill.capabilities)
    ? skill.capabilities
    : skill.capabilities
    ? [skill.capabilities]
    : []

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">{skill.displayName}</CardTitle>
          </div>
          <Badge
            className={categoryColors[skill.category] || "bg-gray-100 text-gray-800"}
            variant="secondary"
          >
            {skill.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Capabilities
            </h4>
            <ul className="space-y-1">
              {capabilities.slice(0, 3).map((cap: unknown, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start">
                  <span className="mr-2">•</span>
                  <span className="line-clamp-1">
                    {typeof cap === "string" ? cap : (cap as { name?: string; description?: string }).name || (cap as { name?: string; description?: string }).description || "Unknown"}
                  </span>
                </li>
              ))}
              {capabilities.length > 3 && (
                <li className="text-sm text-muted-foreground italic">
                  +{capabilities.length - 3} more
                </li>
              )}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Cost</span>
            <span className="text-sm font-bold">
              {skill.costPerExecution
                ? `${skill.costPerExecution} credits`
                : "Free"}
            </span>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-0">
          <Button asChild className="w-full" variant="outline">
            <Link href={`/skills/${skill.id}`}>View Details</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
