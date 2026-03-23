import Link from "next/link"

export function Navigation() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            AgentBay
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/browse" className="hover:text-blue-600">
              Browse
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
