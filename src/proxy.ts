import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/modules/auth/application/session";

// Every one of these route groups already calls requirePermission()/
// requireAuthenticatedUser() in its own Server Component, which is the real
// authorization boundary (this proxy only knows "is there a valid session",
// not which permission a given page needs). It exists as a defense-in-depth
// net: if a future page under one of these prefixes forgets that call, this
// still stops an anonymous request before it renders anything.
const PROTECTED_PREFIXES = [
  "/account",
  "/dashboard",
  "/documents",
  "/finances",
  "/inventory",
  "/projects",
  "/reports",
  "/requisitions",
  "/users",
  "/website"
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const token = request.cookies.get("session")?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/documents/:path*",
    "/finances/:path*",
    "/inventory/:path*",
    "/projects/:path*",
    "/reports/:path*",
    "/requisitions/:path*",
    "/users/:path*",
    "/website/:path*"
  ]
};
