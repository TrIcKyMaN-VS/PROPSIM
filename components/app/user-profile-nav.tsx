"use client"

import { useSession, signOut } from "next-auth/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Settings, LogOut, Award, BarChart, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function UserProfileNav() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user) return null

  const user = session.user as any
  const fallback = user.name ? user.name.slice(0, 2).toUpperCase() : "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-10 w-10 rounded-full overflow-hidden hover:opacity-80 transition-opacity focus:outline-none">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{fallback}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <div className="font-normal px-2 py-1.5">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary border border-primary/30">
                  {user.plan || "FREE"} PLAN
                </span>
                {user.role === "ADMIN" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-destructive/20 text-destructive border border-destructive/30">
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/app/profile')} className="cursor-pointer flex items-center w-full">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/app/analytics')} className="cursor-pointer flex items-center w-full">
            <BarChart className="mr-2 h-4 w-4" />
            <span>Performance</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/app/profile#achievements')} className="cursor-pointer flex items-center w-full">
            <Award className="mr-2 h-4 w-4" />
            <span>Achievements</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/app/profile/settings')} className="cursor-pointer flex items-center w-full">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer flex items-center w-full text-destructive">
              <ShieldAlert className="mr-2 h-4 w-4" />
              <span>Admin Dashboard</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="cursor-pointer text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
