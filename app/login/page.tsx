"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { VsxBrandLogo } from "@/components/ui/vsx-logo"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enabledProviders, setEnabledProviders] = useState<Record<string, any> | null>(null)

  const expired = searchParams.get("expired")
  const suspended = searchParams.get("suspended")
  const callbackUrl = searchParams.get("callbackUrl") || "/app"

  useEffect(() => {
    if (expired) toast.info("Your session expired. Please sign in again.")
  }, [expired])

  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await fetch("/api/auth/providers")
        if (res.ok) {
          const data = await res.json()
          setEnabledProviders(data)
        }
      } catch (err) {
        console.error("Failed to load auth providers:", err)
      }
    }
    loadProviders()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email,
        password,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
      })

      if (!res || res.error) {
        if (res?.error === "TOO_MANY_ATTEMPTS") {
          toast.error("Too many login attempts. Please wait a few minutes.")
        } else if (res?.error?.startsWith("ACCOUNT_")) {
          const status = res.error.replace("ACCOUNT_", "").toLowerCase()
          toast.error(`Your account has been ${status}. Contact support.`)
        } else {
          toast.error("Incorrect email or password.")
        }
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-primary/10 via-background to-primary/5 p-12 border-r border-border">
        <VsxBrandLogo iconSize={32} />
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome back,<br />trader.</h1>
          <p className="text-muted-foreground text-lg">Sign in to continue your training. Your data, challenges, and journal are waiting.</p>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 VSX. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <VsxBrandLogo iconSize={28} />
          </div>

          {suspended && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Your account has been <strong className="capitalize ml-1">{suspended}</strong>. Please contact support.
            </div>
          )}
          {expired && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Your session expired. Please sign in again.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(s => !s)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    Remember me for 90 days
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              {enabledProviders && (enabledProviders.google || enabledProviders["azure-ad"] || enabledProviders.github) && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {enabledProviders.google && (
                      <Button variant="outline" type="button" onClick={() => signIn("google", { callbackUrl })} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </Button>
                    )}
                    {enabledProviders["azure-ad"] && (
                      <Button variant="outline" type="button" onClick={() => signIn("azure-ad", { callbackUrl })} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
                          <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                          <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                          <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                          <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                        </svg>
                        Continue with Microsoft
                      </Button>
                    )}
                    {enabledProviders.github && (
                      <Button variant="outline" type="button" onClick={() => signIn("github", { callbackUrl })} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        Continue with GitHub
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Create account
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
