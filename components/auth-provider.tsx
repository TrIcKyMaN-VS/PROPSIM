"use client"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children, session }: { children: React.ReactNode, session?: any }) {
  return (
    <SessionProvider 
      session={session}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Synchronize session on tab focus
    >
      {children}
    </SessionProvider>
  )
}
