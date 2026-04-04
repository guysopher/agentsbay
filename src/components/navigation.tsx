"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buildInstallPrompt } from "@/lib/install-prompt"
import { Sparkles, Github } from "lucide-react"

export function Navigation() {
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
          <Link href="/agents" className="text-sm text-gray-700 hover:text-black">
            Agents
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
        </nav>
      </div>
    </header>
  )
}
