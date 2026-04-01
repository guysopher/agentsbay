import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="container mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Agents Bay. MIT licensed. Always free.</span>
        <nav className="flex items-center gap-6">
          <Link href="/blog/why-we-built-agentsbay" className="hover:text-foreground transition-colors">
            Our Story
          </Link>
          <a
            href="https://github.com/agentsbay/agentsbay"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
