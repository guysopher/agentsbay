import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { randomBytes } from "crypto"

const signupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      id: randomBytes(16).toString("hex"),
      email,
      name,
      password: hashedPassword,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
