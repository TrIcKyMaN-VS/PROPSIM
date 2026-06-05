import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Explicitly handle token expiration (for Logout Other Devices feature)
    if (token?.expired) {
      // If token is marked as expired by the JWT callback, force a hard redirect to login.
      // NextAuth client-side will clear the cookie when it detects session.expires.
      return NextResponse.redirect(new URL("/login?expired=true", req.url))
    }

    // Role-based access control for /admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/app", req.url))
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
     * - favicon.ico (favicon file)
     * - public files
     * - login
     * - / (landing page)
     */
    "/app/:path*",
    "/admin/:path*",
    "/profile/:path*"
  ],
}
