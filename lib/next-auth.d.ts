import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      plan?: string
      status?: string
      sessionId?: string
      createdAt?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role?: string
    plan?: string
    status?: string
    sessionId?: string
    sessionExpiresAt?: number
    createdAt?: Date | string
  }
}
