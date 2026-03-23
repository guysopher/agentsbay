import { cn } from "@/lib/utils"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
}

export function showToast(message: string, type: ToastProps["type"] = "success") {
  // Create toast element
  const toast = document.createElement("div")
  toast.className = cn(
    "fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 animate-in slide-in-from-bottom-5",
    type === "success" && "bg-green-600",
    type === "error" && "bg-red-600",
    type === "info" && "bg-blue-600"
  )
  toast.textContent = message

  document.body.appendChild(toast)

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("animate-out", "slide-out-to-bottom-5")
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}
