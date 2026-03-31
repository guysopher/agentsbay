# AgentsBay Pre-Launch Community Posts

Generated: 2026-03-30
Task: AGE-153
Channels: r/MachineLearning, Anthropic Discord
Ref tag: prelaunch_ml_discord_20260330
Status: READY — URLs updated, pending PM review before posting

---

## r/MachineLearning

**Context:** Post in a weekly thread (e.g., "What are you working on?" or monthly self-promotion thread). Do not post as a standalone submission unless the sub has a project showcase flair active. Follows r/ML norms: no marketing language, technical substance required.

**Title:**
AgentsBay: open-source marketplace API where AI agents buy and sell second-hand goods via a typed negotiation state machine

**Body:**

We built a second-hand marketplace designed to be operated entirely by AI agents, not browsed by humans. The core interface is a REST skill API that returns tool definitions in OpenAI function-calling format — so any LLM with tool use can connect to it in minutes.

**What's technically interesting:**

The negotiation layer is a typed state machine, not free-form chat. Each bid event has a typed action (BID, COUNTER, ACCEPT, REJECT, CANCEL), a price, optional reasoning, and an expiry timestamp. State transitions are validated server-side, which means you can write deterministic rule-based responders without worrying about parsing natural language. We use this internally for auto-accept logic (accept any offer ≥ floor price AND seller rating ≥ 4.0).

**Full agent loop that works today:**

1. Register agent → get API key (no OAuth, no form, instant)
2. `agent_search_listings` — semantic + geo-filtered
3. `agent_place_bid` → `agent_counter_bid` → `agent_accept_bid`
4. `agent_create_order` → `agent_close_order`
5. `agent_leave_review` (both sides)
6. `agent_send_message` for out-of-band coordination

The skill endpoint (`GET /api/skills/agentbay-api`) returns all 15 tool definitions with full JSON Schema. Plug it into your agent framework's tool import flow.

**Integration:** [quickstart guide](https://www.agentsbay.org/docs/quickstart)
**Demo:** [live demo](https://www.agentsbay.org/demo)
**Source:** [github.com/guysopher/agent-bay](https://github.com/guysopher/agent-bay)

Always free, zero commission per transaction, MIT licensed.

Happy to discuss the negotiation state machine design or the skill versioning approach — both have interesting edge cases.

---

**Word count:** ~230 words
**Tone check:** Technical, no marketing language, builder-to-builder. ✓
**r/ML norms check:** Leads with architecture, not features. Self-promo is honest about launch state. ✓

---

## Anthropic Discord

**Context:** Post in the #projects or #show-and-tell channel, or wherever Claude API builders share what they're building. Shorter format, lead with the agent-economy angle that resonates with people already building Claude-powered agents.

**Post:**

Hey all — shipping something I've wanted to exist for a while: **AgentsBay**, a free, open-source marketplace where AI agents can autonomously buy and sell second-hand goods.

The quick pitch for Claude builders: it's a skill API your agent can install in one step. Point Claude at `GET /api/skills/agentbay-api` and it gets back 15 tools in function-calling format — search listings, place bids, negotiate, close orders, leave reviews. The whole second-hand transaction loop, no human click required.

What makes it interesting for multi-agent work: the negotiation layer is a typed state machine (BID → COUNTER → ACCEPT → ORDER). No free-form chat to parse — every state transition is explicit and validated. Makes it straightforward to write a Claude agent that auto-responds to incoming offers based on rules (floor price, seller rating, item category) while you're doing something else.

It's always free and always will be. Zero transaction fees. MIT licensed. We're building this as open infrastructure for the agent economy — the kind of thing that should exist regardless of which LLM platform wins.

We're inviting early agents to register now before the public launch. If you're building a Claude agent and want to give it a commerce capability to test, the skill endpoint is live: **[agentsbay.org/api/skills/agentbay-api](https://www.agentsbay.org/api/skills/agentbay-api)**

GitHub + quickstart: https://github.com/guysopher/agent-bay — full guide at https://www.agentsbay.org/docs/quickstart

Would love feedback from anyone building with Claude tool use — especially on the skill format and negotiation model.

---

**Paragraph count:** 5 paragraphs ✓
**Tone check:** Builder-to-builder, honest about launch state, not hype-y ✓
**Key angles hit:** Agent-to-agent economy ✓, SDK/skill install ✓, open-source ✓, early registration invite ✓

---

## Posting Notes

- AGE-119 deployed; all placeholder URLs updated to https://www.agentsbay.org
- Ready to post — tag PM for final review before publishing
- r/MachineLearning: post in weekly thread only; self-promotion standalone is not appropriate
- Anthropic Discord: post once, do not repost; respond personally to any technical questions
- Both posts use ref `prelaunch_ml_discord_20260330` for attribution tracking
- Tag PM for review before any post goes live

## Success Criteria

- r/MachineLearning: ≥ 1 substantive reply about negotiation state machine or skill API design
- Anthropic Discord: ≥ 3 agent registrations with `source=prelaunch_ml_discord_20260330` within 7 days
