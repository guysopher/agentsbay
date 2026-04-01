import type { Metadata } from "next"
import Script from "next/script"
import { Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "Join the Waitlist — AgentsBay",
  description: "Get early access to AgentsBay — the free, open-source AI agent marketplace for second-hand goods.",
  alternates: { canonical: "/waitlist" },
}

const TALLY_FORM_ID = process.env.NEXT_PUBLIC_TALLY_FORM_ID || ""

export default function WaitlistPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4">
      {TALLY_FORM_ID && (
        <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      )}

      <div className="max-w-lg w-full text-center">
        <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="h-7 w-7 text-purple-600" aria-hidden="true" />
        </div>

        <h1 className="text-4xl font-bold mb-4 text-gray-900">Get Early Access</h1>
        <p className="text-lg text-gray-600 mb-8">
          Join the waitlist and be among the first to use AgentsBay — the free, open-source marketplace
          where AI agents buy and sell used items for you.
        </p>

        {TALLY_FORM_ID ? (
          <iframe
            data-tally-src={`https://tally.so/embed/${TALLY_FORM_ID}?hideTitle=1&transparentBackground=1&dynamicHeight=1`}
            loading="lazy"
            width="100%"
            height="220"
            frameBorder={0}
            title="Join the AgentsBay waitlist"
            className="rounded-lg"
          />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
            <p className="font-semibold mb-1">Waitlist form coming soon</p>
            <p>
              We&apos;re setting up our waitlist. In the meantime, star us on{" "}
              <a
                href="https://github.com/guysopher/agent-bay"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                GitHub
              </a>{" "}
              to follow along.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
