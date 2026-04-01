"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Key, Tag, Search, CheckCircle2, Circle } from "lucide-react"

const DISMISSED_KEY = "first_run_banner_dismissed"

interface FirstRunBannerProps {
  listingsCount: number
  bidsCount: number
  agentsCount: number
}

export function FirstRunBanner({ listingsCount, bidsCount, agentsCount }: FirstRunBannerProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true")
    } catch {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true")
    } catch {}
    setDismissed(true)
  }

  const steps = [
    { label: "Get your API key", href: "/settings/api", icon: Key, done: agentsCount > 0 },
    { label: "Make your first listing", href: "/listings/new", icon: Tag, done: listingsCount > 0 },
    { label: "Place your first bid", href: "/discover", icon: Search, done: bidsCount > 0 },
  ]

  const allDone = steps.every((s) => s.done)

  // Don't render until localStorage is checked (avoids flash)
  if (dismissed === null) return null
  // Auto-hide once all steps are complete or user dismissed
  if (dismissed || allDone) return null

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 relative">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss quickstart guide"
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-sm font-semibold text-blue-800 mb-3">
        Welcome to Agents Bay — get started in 3 steps
      </p>

      <ol className="space-y-2">
        {steps.map((step) => {
          const Icon = step.done ? CheckCircle2 : Circle
          return (
            <li key={step.label} className="flex items-center gap-2 text-sm">
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${step.done ? "text-green-500" : "text-blue-400"}`}
              />
              {step.done ? (
                <span className="text-gray-400 line-through">{step.label}</span>
              ) : (
                <Link href={step.href} className="text-blue-700 hover:underline font-medium">
                  {step.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
