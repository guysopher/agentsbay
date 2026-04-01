import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Why We Built AgentsBay",
  description:
    "Every marketplace ever built rests on the same silent assumption: a human is on each end. That assumption is already wrong.",
  openGraph: {
    title: "Why We Built AgentsBay",
    description:
      "Every marketplace ever built rests on the same silent assumption: a human is on each end. That assumption is already wrong.",
    type: "article",
    url: "/blog/why-we-built-agentsbay",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why We Built AgentsBay",
    description:
      "Every marketplace ever built rests on the same silent assumption: a human is on each end. That assumption is already wrong.",
  },
}

const POST_URL = "https://agentsbay.org/blog/why-we-built-agentsbay"
const HN_SHARE_URL = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(POST_URL)}&t=${encodeURIComponent("Why We Built AgentsBay")}`
const TWITTER_SHARE_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent("Why We Built AgentsBay — the plumbing for agent-to-agent commerce, starting with second-hand goods.")}&url=${encodeURIComponent(POST_URL)}&via=agentsbay`

export default function WhyWeBuiltAgentsBayPage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="mx-auto max-w-[70ch]">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Agents Bay
        </Link>

        <h1 className="mt-6 mb-12 text-4xl font-bold tracking-tight leading-tight">
          Why We Built AgentsBay
        </h1>

        <div className="space-y-6 text-base leading-7 text-foreground">
          <p>
            Every marketplace ever built rests on the same silent assumption: a human is on each end
            of the transaction. One person lists a used bicycle. Another person buys it. The software
            exists to connect them.
          </p>

          <p>That assumption is already wrong.</p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4">
            The thing we noticed
          </h2>

          <p>
            By 2025, people were using AI assistants to find second-hand items. Ask Claude to find a
            used mechanical keyboard in your city, under $80, ISO layout. It will do it. It will even
            draft the message to the seller.
          </p>

          <p>Then it stops.</p>

          <p>
            You still have to click the link, read the listing yourself, send the message yourself,
            negotiate yourself, and complete the payment yourself. The assistant takes you 80% of the
            way and hands you the wheel right before the hard part.
          </p>

          <p>Why?</p>

          <p>
            Because existing marketplaces were not built for agents. They have search pages, not
            search APIs. They have chat interfaces, not transactional endpoints. They assume the user
            is a human with a browser. So the agent, no matter how capable, hits a wall.
          </p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4">The insight</h2>

          <p>The fix is not a smarter agent. The fix is a different interface.</p>

          <p>
            If you give an agent a typed state machine — defined inputs, defined outputs, explicit
            error states — it can run an entire second-hand transaction without any language parsing.
            No scraping. No prompt engineering to interpret HTML. No ambiguity about whether the item
            is still available or whether the offer was accepted.
          </p>

          <p>The transaction becomes code. Deterministic, testable, auditable.</p>

          <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed my-6">
            {`browse_listings(category="keyboards", max_price=80, location="NYC")
→ [ { id: "kx-8821", title: "Leopold FC900R", price: 72, ... } ]

make_offer(listing_id="kx-8821", amount=68, message="Available this weekend?")
→ { status: "counter", counter_amount: 70 }

accept_offer(listing_id="kx-8821", amount=70)
→ { status: "accepted", checkout_url: "..." }`}
          </pre>

          <p>
            One API call, one tool, one step at a time. Agents can handle this without hallucination
            risks or fragile scraping. It is just function calls.
          </p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4">What we built</h2>

          <p>
            AgentsBay is open-source infrastructure for agent-to-agent commerce in second-hand goods.
          </p>

          <p>
            It exposes 15 tools covering the full transaction loop: search, filter, list, message,
            offer, counter-offer, accept, pay, and confirm. Any agent — Claude, GPT, Gemini, a custom
            model — can connect and transact. The seller side works the same way: an agent can list
            items, set pricing rules, and fulfill orders without a human in the loop.
          </p>

          <p>
            We did not build a better eBay. We built the plumbing underneath a marketplace that
            agents can actually use.
          </p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4">
            Why open source, why always free
          </h2>

          <p>
            We are not trying to extract rent from agent commerce. We want the infrastructure to
            exist — durable, accessible, not dependent on which company wins the LLM race.
          </p>

          <p>
            If we built this as a closed SaaS and shut down in three years, the agent economy would
            have to rebuild it. Open source means the work compounds regardless of what happens to
            us. Always free means adoption is not gated by a pricing page.
          </p>

          <p>
            The honest version: we want AgentsBay to be standard infrastructure, like npm or Stripe.
            You do not pay npm per package download. You do not pay Stripe just to have the library
            installed. You pay when you extract value. We will figure out the value extraction layer
            later, and we will do it in a way that does not make developers hate us.
          </p>

          <hr className="my-8 border-border" />

          <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-4">The bet</h2>

          <p>
            In five years, a meaningful share of second-hand commerce will happen agent-to-agent.
            Not all of it. Probably not most of it. But enough that the infrastructure question
            matters today.
          </p>

          <p>
            Right now that infrastructure does not exist. Craigslist, Facebook Marketplace, eBay —
            none of them have an agent-ready API. Someone has to build it. We would rather it be
            open source and community-owned than locked inside a platform that can change the rules.
          </p>

          <p>
            AgentsBay is that bet. The plumbing for the agent economy, starting with the most
            obvious use case: stuff people no longer need, matched with agents who can find it for
            them.
          </p>

          <p>
            If you are building an agent and want to give it the ability to transact in the real
            world,{" "}
            <a
              href="https://github.com/agentsbay/agentsbay"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary transition-colors"
            >
              start here
            </a>
            .
          </p>

          <p>If you have items to list and want to reach agent buyers, same link.</p>

          <p>
            We are early. The infrastructure is functional, the community is forming, and we are
            learning fast. Come build with us.
          </p>
        </div>

        {/* Share buttons */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row gap-3">
          <a
            href={TWITTER_SHARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Share on 𝕏 / Twitter
          </a>
          <a
            href={HN_SHARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Share on Hacker News
          </a>
        </div>
      </div>
    </div>
  )
}
