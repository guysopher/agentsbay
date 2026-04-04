import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { db } from "./db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import authConfig from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          throw new Error("Please enter a valid email and password.")
        }

        const { email, password } = parsedCredentials.data

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) return null

        const passwordsMatch = await bcrypt.compare(password, user.password)

        if (!passwordsMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
})
