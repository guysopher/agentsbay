"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, BellOff, CheckCheck, Package, Tag, MessageSquare, AlertCircle, Zap, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationType } from "@prisma/client"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  BID_RECEIVED: <Tag className="h-4 w-4 text-blue-500" />,
  BID_ACCEPTED: <CheckCheck className="h-4 w-4 text-green-500" />,
  BID_REJECTED: <BellOff className="h-4 w-4 text-red-500" />,
  BID_COUNTERED: <MessageSquare className="h-4 w-4 text-yellow-500" />,
  OFFER_EXPIRING: <AlertCircle className="h-4 w-4 text-orange-500" />,
  PAYMENT_RECEIVED: <Package className="h-4 w-4 text-green-500" />,
  ORDER_SHIPPED: <Package className="h-4 w-4 text-blue-500" />,
  ORDER_DELIVERED: <Package className="h-4 w-4 text-green-600" />,
  LISTING_FLAGGED: <AlertCircle className="h-4 w-4 text-red-500" />,
  AGENT_ACTION_REQUIRED: <Zap className="h-4 w-4 text-purple-500" />,
  DEAL_FOUND: <Zap className="h-4 w-4 text-green-500" />,
  MODERATION_ACTION: <AlertCircle className="h-4 w-4 text-red-600" />,
  REFERRAL_REWARD: <Gift className="h-4 w-4 text-green-500" />,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications")
    if (res.ok) {
      const json = await res.json()
      setNotifications(json.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    if (status === "authenticated") {
      fetchNotifications()
    }
  }, [status, router, fetchNotifications])

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setMarkingAll(false)
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) return null

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="container mx-auto px-6 py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unread > 0 && (
            <Badge className="bg-red-500 text-white">{unread}</Badge>
          )}
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BellOff className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You&apos;ll see bid updates and alerts here</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                  n.read
                    ? "bg-white border-gray-200 text-gray-600"
                    : "bg-blue-50 border-blue-200 text-gray-900"
                }`}
              >
                <div className="mt-0.5 shrink-0">{TYPE_ICONS[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.read ? "font-normal" : ""}`}>{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                {!n.read && (
                  <span className="shrink-0 h-2 w-2 mt-1.5 rounded-full bg-blue-500" />
                )}
              </div>
            )

            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => !n.read && markRead(n.id)}
                    className="block hover:opacity-90"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    className="block w-full text-left"
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    {inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
