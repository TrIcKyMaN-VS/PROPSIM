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
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-4 flex-1">
              <AccountSwitcher />
              <ChallengeStatusBar />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden md:inline-block">Simulation mode</span>
              <UserProfileNav />
            </div>
          </header>
          <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
            <StoreInit>{children}</StoreInit>
          </main>
          <MobileNav />
        </div>
      </div>
      <ChallengeCopilot />
    </AuthProvider>
  )
}
