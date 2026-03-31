export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")

    const { registerAutoNegotiationHandlers } = await import(
      "@/domain/negotiations/auto-negotiation"
    )
    registerAutoNegotiationHandlers()
    console.log("[Startup] Auto-negotiation event handlers registered")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}
