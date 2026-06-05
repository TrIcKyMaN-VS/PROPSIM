import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import AzureADProvider from "next-auth/providers/azure-ad"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"

const prisma = new PrismaClient()

// Secure session cookies configuration
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://')
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
const hostPrefix = useSecureCookies ? "__Host-" : ""

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any, // type workaround for next-auth v4 with prisma adapter
  session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60, // 90 days max (controlled dynamically by JWT)
    updateAge: 24 * 60 * 60, // 24 hours auto-refresh
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { sameSite: 'lax', path: '/', secure: useSecureCookies },
    },
    csrfToken: {
      name: `${hostPrefix}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
      allowDangerousEmailAccountLinking: true,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "MOCK_CLIENT_ID",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "MOCK_CLIENT_ID",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "MOCK_CLIENT_SECRET",
      tenantId: process.env.AZURE_AD_TENANT_ID,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        // For local development, auto-create the user if they don't exist
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          const hashedPassword = await bcrypt.hash(credentials.password, 10)
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
              password: hashedPassword
            }
          })
        } else if (user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        // Track Device Session
        const headersList = await headers()
        const userAgent = headersList.get('user-agent') || 'Unknown Browser'
        const ip = headersList.get('x-forwarded-for') || 'Unknown IP'
        const rememberMe = credentials.rememberMe === 'true'
        const sessionAge = rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60 // 90 days or 30 days
        const expiresAt = new Date(Date.now() + sessionAge * 1000)

        const deviceSession = await prisma.deviceSession.create({
          data: {
            userId: user.id,
            userAgent,
            ip,
            expiresAt
          }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          sessionId: deviceSession.id,
          sessionExpiresAt: expiresAt.getTime()
        } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.plan = (user as any).plan
        
        // If SSO login, create a device session here
        if (account && account.provider !== 'credentials') {
          const headersList = await headers()
          const userAgent = headersList.get('user-agent') || 'Unknown Browser'
          const ip = headersList.get('x-forwarded-for') || 'Unknown IP'
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for SSO
          
          const deviceSession = await prisma.deviceSession.create({
            data: {
              userId: user.id,
              userAgent,
              ip,
              expiresAt
            }
          })
          token.sessionId = deviceSession.id
          token.sessionExpiresAt = expiresAt.getTime()
          
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })
        } else {
          token.sessionId = (user as any).sessionId
          token.sessionExpiresAt = (user as any).sessionExpiresAt
        }
      }

      // Check explicit JWT expiration (for Remember Me logic)
      if (token.sessionExpiresAt && Date.now() > (token.sessionExpiresAt as number)) {
        return { ...token, expired: true }
      }

      // Check if session is explicitly invalidated in DB (Logout Other Devices)
      if (token.sessionId) {
        // Fast-path: Only check DB every 5 minutes to avoid excessive queries
        const lastDbCheck = token.lastDbCheck as number || 0
        if (Date.now() - lastDbCheck > 5 * 60 * 1000) {
          const deviceSession = await prisma.deviceSession.findUnique({
            where: { id: token.sessionId as string }
          })
          if (!deviceSession || !deviceSession.isValid || deviceSession.expiresAt.getTime() < Date.now()) {
            return { ...token, expired: true }
          }
          token.lastDbCheck = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token.expired) {
        session.expires = new Date(0).toISOString() // Force client logout
        return session
      }

      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).plan = token.plan as string
        ;(session.user as any).sessionId = token.sessionId as string
      }
      return session
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
