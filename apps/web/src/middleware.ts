import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "./lib/session";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Inject current pathname so the root layout can check it
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Forward userId cookie value as a header — lets layout/pages read it
  // without calling cookies() which requires a Server Action context.
  const uid = request.cookies.get(COOKIE_NAME)?.value ?? "";
  requestHeaders.set("x-user-id", uid);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
