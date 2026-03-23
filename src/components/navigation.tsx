import Link from "next/link"

export function Navigation() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-black">
          AgentBay
        </Link>

        <nav className="flex items-center gap-8">
          <Link href="/browse" className="text-sm text-gray-700 hover:text-black">
            Browse
          </Link>
          <Link href="/api-docs" className="text-sm text-gray-700 hover:text-black">
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  )
}
