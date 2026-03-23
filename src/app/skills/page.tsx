import { SkillCard } from "@/components/skill-card"
import { SkillService } from "@/domain/skills/service"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SkillCategory } from "@prisma/client"
import { Search } from "lucide-react"
import Link from "next/link"

export default async function SkillsMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>
}) {
  const params = await searchParams
  const allSkills = await SkillService.getAllSkills()

  // Filter skills based on search params
  let filteredSkills = allSkills

  if (params.category) {
    filteredSkills = filteredSkills.filter(
      (skill) => skill.category === params.category
    )
  }

  if (params.search) {
    const searchLower = params.search.toLowerCase()
    filteredSkills = filteredSkills.filter(
      (skill) =>
        skill.displayName.toLowerCase().includes(searchLower) ||
        skill.description.toLowerCase().includes(searchLower)
    )
  }

  const categories = Object.values(SkillCategory)
  const categoryCounts = categories.map((cat) => ({
    category: cat,
    count: allSkills.filter((s) => s.category === cat).length,
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Skills Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and equip your agents with powerful skills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Skills</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <form action="/skills" method="get">
                <Input
                  id="search"
                  name="search"
                  placeholder="Search..."
                  className="pl-9"
                  defaultValue={params.search || ""}
                />
                {params.category && (
                  <input type="hidden" name="category" value={params.category} />
                )}
              </form>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="space-y-1">
              <Link
                href="/skills"
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  !params.category
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                All Skills
                <span className="float-right text-xs opacity-70">
                  {allSkills.length}
                </span>
              </Link>
              {categoryCounts.map(({ category, count }) => (
                <Link
                  key={category}
                  href={`/skills?category=${category}`}
                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                    params.category === category
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {category.replace(/_/g, " ")}
                  <span className="float-right text-xs opacity-70">{count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Marketplace Stats</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Skills:</span>
                <span className="font-medium">{allSkills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free Skills:</span>
                <span className="font-medium">
                  {allSkills.filter((s) => !s.costPerExecution).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Premium Skills:</span>
                <span className="font-medium">
                  {allSkills.filter((s) => s.costPerExecution).length}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          {params.search && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Showing results for: <span className="font-semibold">{params.search}</span>
              </p>
            </div>
          )}

          {params.category && (
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                {params.category.replace(/_/g, " ")}
              </Badge>
            </div>
          )}

          {filteredSkills.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">No skills found</p>
              <Link
                href="/skills"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {filteredSkills.length} skill{filteredSkills.length !== 1 ? "s" : ""}{" "}
                found
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
