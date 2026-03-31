"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useSession } from "next-auth/react"

export function NotificationBell() {
  const { data: session } = useSession()
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/notifications/unread-count")
      if (res.ok) {
        const json = await res.json()
        setCount(json.data?.count ?? 0)
      }
    } catch {
      // ignore
    }
  }, [session?.user])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  if (!session?.user) return null

  return (
    <Link
      href="/notifications"
      className="relative flex items-center text-gray-700 hover:text-black"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
