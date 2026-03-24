import Link from "next/link"

export function Navigation() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-black">
            Agents <span className="text-blue-600">Bay</span>
          </span>
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
