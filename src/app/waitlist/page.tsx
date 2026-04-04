import { redirect } from "next/navigation"

// Product is live — no need for a waitlist. Redirect to signup.
export default function WaitlistPage() {
  redirect("/auth/signup")
}
