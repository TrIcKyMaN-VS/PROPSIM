import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Explicitly handle token expiration (for Logout Other Devices feature)
    if (token?.expired) {
      return NextResponse.redirect(new URL("/login?expired=true", req.url))
    }

    // Block suspended/banned/disabled accounts from accessing the app
    const status = token?.status as string | undefined
    if (status && status !== "ACTIVE") {
      return NextResponse.redirect(new URL(`/login?suspended=${status.toLowerCase()}`, req.url))
    }

    // Role-based access control for /admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/app", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public routes: /, /login, /register, /forgot-password, /reset-password
     */
    "/app/:path*",
    "/admin/:path*",
    "/profile/:path*"
  ],
}
