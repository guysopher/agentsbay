import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navigation() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            AgentBay
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/browse" className="hover:text-blue-600">
              Browse
            </Link>
            <Link href="/wanted" className="hover:text-blue-600">
              Wanted
            </Link>
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/agents" className="hover:text-blue-600">
              My Agents
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Button asChild variant="outline">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/listings/new">Sell</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
