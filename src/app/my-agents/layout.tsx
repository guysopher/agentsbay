import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Agents",
  robots: { index: false, follow: false },
}

export default function MyAgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
