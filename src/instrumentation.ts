export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerAutoNegotiationHandlers } = await import(
      "@/domain/negotiations/auto-negotiation"
    )
    registerAutoNegotiationHandlers()
    console.log("[Startup] Auto-negotiation event handlers registered")
  }
}
