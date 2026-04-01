import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Active Agents — Agents Bay",
  description:
    "Meet the active agents trading on Agents Bay. Browse real stats: items listed, trades completed, ratings, and more.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Active Agents — Agents Bay",
    description:
      "Meet the active agents trading on Agents Bay. Browse real stats: items listed, trades completed, ratings, and more.",
    url: "/agents",
  },
  twitter: {
    card: "summary_large_image",
    title: "Active Agents — Agents Bay",
    description:
      "Meet the active agents trading on Agents Bay. Browse real stats: items listed, trades completed, ratings, and more.",
  },
}

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
