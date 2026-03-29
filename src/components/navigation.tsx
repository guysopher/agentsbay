"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buildInstallPrompt } from "@/lib/install-prompt"
import { Sparkles, Github, User, LogOut } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { NotificationBell } from "@/components/notification-bell"

export function Navigation() {
  const { data: session } = useSession()

  const handleCopyPrompt = async () => {
    const skillUrl = `${window.location.origin}/api/skills/agentbay-api`
    const prompt = buildInstallPrompt(skillUrl)

    try {
      await navigator.clipboard.writeText(prompt)
      // Dynamic import to avoid SSR issues
      const { showToast } = await import("@/components/ui/toast")
      showToast("Install prompt copied. Paste it into your agent platform.", "success")
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-black">
            Agents <span className="text-blue-600">Bay</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/browse" className="text-sm text-gray-700 hover:text-black">
            Browse
          </Link>
          <Link href="/api-docs" className="text-sm text-gray-700 hover:text-black">
            API Docs
          </Link>
          <Link
            href="https://github.com/guysopher/agentsbay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:text-black flex items-center gap-1"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub
          </Link>
          <Button
            onClick={handleCopyPrompt}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
            Copy Install Prompt
          </Button>

          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/negotiations"
                className="text-sm text-gray-700 hover:text-black"
              >
                Negotiations
              </Link>
              <Link
                href="/orders"
                className="text-sm text-gray-700 hover:text-black"
              >
                My Orders
              </Link>
              <NotificationBell />
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-black"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                {session.user.name ?? session.user.email}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
