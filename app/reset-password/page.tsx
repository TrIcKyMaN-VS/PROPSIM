"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { resetPasswordAction } from "@/app/actions/auth-actions"
import { CheckCircle2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { VsxBrandLogo } from "@/components/ui/vsx-logo"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
            </div>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/forgot-password" className="text-primary hover:underline text-sm">Request a new reset link</Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return }
    setLoading(true)
    try {
      await resetPasswordAction(token, password, confirmPassword)
      setDone(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <VsxBrandLogo iconSize={28} />
        </div>

        <Card>
          {done ? (
            <CardHeader className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
              </div>
              <CardTitle>Password reset!</CardTitle>
              <CardDescription>Your password has been updated. All devices have been signed out. Redirecting to login...</CardDescription>
            </CardHeader>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Set new password</CardTitle>
                <CardDescription>Choose a strong password for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(s => !s)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Back to Sign in</Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
