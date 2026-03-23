// Skills domain exports
export * from "./types"
export * from "./service"
export * from "./registry"

// Import skill implementations to auto-register them
import "./implementations/claude-code"
