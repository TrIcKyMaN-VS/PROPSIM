import type React from "react"
import { AppSidebar } from "@/components/app/app-sidebar"
import { MobileNav } from "@/components/app/mobile-nav"
import { StoreInit } from "@/components/app/store-init"
import { AccountSwitcher } from "@/components/app/account-switcher"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { AuthProvider } from "@/components/auth-provider"
import { ChallengeCopilot } from "@/components/app/challenge-copilot"
import { ChallengeStatusBar } from "@/components/app/challenge-status-bar"
import { UserProfileNav } from "@/components/app/user-profile-nav"
import { CommandPalette } from "@/components/app/command-palette"
import { PageTransition } from "@/components/app/page-transition"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/60 px-4 backdrop-blur-md md:px-6">
            <div className="flex items-center gap-4 flex-1">
              <AccountSwitcher />
              <ChallengeStatusBar />
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                <kbd className="font-mono text-[10px]">CTRL</kbd><span className="mx-1">+</span><kbd className="font-mono text-[10px]">K</kbd>
                <span className="ml-2">Search</span>
              </div>
              <UserProfileNav />
            </div>
          </header>
          <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10 relative overflow-hidden">
            <StoreInit>
              <PageTransition>
                {children}
              </PageTransition>
            </StoreInit>
          </main>
          <MobileNav />
        </div>
      </div>
      <ChallengeCopilot />
      <CommandPalette />
    </AuthProvider>
  )
}
