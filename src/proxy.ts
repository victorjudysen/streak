import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

// Sends anyone without a valid session to /login. This is the first gate only —
// every server action checks the session again (see lib/auth.ts).
export function proxy(request: NextRequest) {
  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page, the Telegram webhook, and static files.
  matcher: ["/((?!login|api/telegram|_next/static|_next/image|icon.svg|favicon.ico|robots.txt).*)"],
};
