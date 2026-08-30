"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { registerAction } from "@/app/actions/auth-actions"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { VsxBrandLogo } from "@/components/ui/vsx-logo"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength]
  const strengthColor = ["", "bg-destructive", "bg-warning", "bg-primary", "bg-success"][passwordStrength]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error("Please accept the Terms of Service to continue."); return }
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match."); return }

    setLoading(true)
    try {
      await registerAction(form)
      toast.success("Account created! Signing you in...")
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (res?.ok) {
        router.push("/app")
      } else {
        router.push("/login")
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed.")
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
          <h1 className="text-4xl font-bold tracking-tight mb-4">Train smarter.<br/>Pass faster.</h1>
          <p className="text-muted-foreground text-lg">Join thousands of traders using VSX to master prop firm challenges before paying for one.</p>
          <div className="mt-8 space-y-3">
            {["Simulate any prop firm challenge rules", "AI trading coach & DNA analysis", "Journal, calendar, and weekly reviews", "No real money at risk"].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 VSX. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <VsxBrandLogo iconSize={28} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Start your free account. No credit card required.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Alex Trader" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                      required
                    />
                    <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Password strength: {strengthLabel}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={e => setForm({...form, confirmPassword: e.target.value})}
                    required
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 mt-0.5 rounded accent-primary" />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
                    I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !agreed}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button variant="outline" type="button" onClick={() => signIn("google", { callbackUrl: "/app" })} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </Button>
                <Button variant="outline" type="button" onClick={() => signIn("github", { callbackUrl: "/app" })} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Sign up with GitHub
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
