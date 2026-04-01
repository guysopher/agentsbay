"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const CODE_RE = /^[A-Z0-9]{8}$/

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ref, setRef] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Priority: URL param → cookie → localStorage
    const fromUrl = searchParams.get("ref")
    if (fromUrl && CODE_RE.test(fromUrl)) {
      setRef(fromUrl)
      // Sync to localStorage as fallback for future navigations
      try { localStorage.setItem("ref_code", fromUrl) } catch {}
      return
    }
    const fromCookie = getCookie("ref_code")
    if (fromCookie && CODE_RE.test(fromCookie)) {
      setRef(fromCookie)
      return
    }
    try {
      const fromStorage = localStorage.getItem("ref_code")
      if (fromStorage && CODE_RE.test(fromStorage)) setRef(fromStorage)
    } catch {}
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ...(ref ? { ref } : {}) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Sign-up failed. Please try again.")
        setLoading(false)
        return
      }

      // Clear referral tracking after successful signup
      try {
        localStorage.removeItem("ref_code")
        document.cookie = "ref_code=; Max-Age=0; path=/"
      } catch {}

      // Auto sign-in after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      setLoading(false)

      if (result?.error) {
        setError("Account created but sign-in failed. Please sign in manually.")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setLoading(false)
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-3xl mb-2">🤖</div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          {ref && (
            <p className="text-sm text-green-600 mt-1">You were invited by a friend!</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
