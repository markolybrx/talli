import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isPublicPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/forgot-password") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/cron");
  const isAppPage =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/tasks") ||
    nextUrl.pathname.startsWith("/calendar") ||
    nextUrl.pathname.startsWith("/timeline") ||
    nextUrl.pathname.startsWith("/goals") ||
    nextUrl.pathname.startsWith("/analytics") ||
    nextUrl.pathname.startsWith("/activity") ||
    nextUrl.pathname.startsWith("/members") ||
    nextUrl.pathname.startsWith("/settings") ||
    nextUrl.pathname.startsWith("/workspace");
  if (!req.auth && isAppPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
