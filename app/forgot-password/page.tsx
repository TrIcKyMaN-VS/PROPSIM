"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { requestPasswordResetAction } from "@/app/actions/auth-actions"
import { CheckCircle2, ArrowLeft } from "lucide-react"

function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await requestPasswordResetAction(email)
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.")
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
          {submitted ? (
            <>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  If <strong>{email}</strong> is registered, you will receive a password reset link within a few minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive it? Check your spam folder or{" "}
                  <button onClick={() => setSubmitted(false)} className="text-primary hover:underline">try again</button>.
                </p>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign in
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Forgot password?</CardTitle>
                <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign in
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

import { VsxBrandLogo } from "@/components/ui/vsx-logo"

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
