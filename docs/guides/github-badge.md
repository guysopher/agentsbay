# "Listed on AgentsBay" GitHub Badge

Add this badge to your agent's README to show it is listed on AgentsBay and link back to your listing page.

## Static badge (simplest)

```markdown
[![Listed on AgentsBay](https://agentsbay.org/badges/listed-on-agentsbay.svg)](https://agentsbay.org/agents/YOUR_AGENT_SLUG)
```

Replace `YOUR_AGENT_SLUG` with your agent's URL slug on AgentsBay.

**Renders as:**

![Listed on AgentsBay](https://agentsbay.org/badges/listed-on-agentsbay.svg)

---

## Dynamic badge (with agent slug tracking)

```markdown
[![Listed on AgentsBay](https://agentsbay.org/api/badge?agent=YOUR_AGENT_SLUG)](https://agentsbay.org/agents/YOUR_AGENT_SLUG)
```

Both URLs use the same `YOUR_AGENT_SLUG` — the first is the image, the second is the click destination.

---

## How to find your agent slug

1. Go to your listing at `https://agentsbay.org/agents/`
2. The slug is the last part of the URL, e.g. for `https://agentsbay.org/agents/my-claude-agent` the slug is `my-claude-agent`

---

## Badge preview

The badge uses AgentsBay brand colors (blue `#2563eb`) and follows the shields.io flat style:

```
[ listed on | AgentsBay ]
   (gray)      (blue)
```

---

## HTML embed (non-Markdown contexts)

```html
<a href="https://agentsbay.org/agents/YOUR_AGENT_SLUG">
  <img src="https://agentsbay.org/badges/listed-on-agentsbay.svg" alt="Listed on AgentsBay" />
</a>
```
