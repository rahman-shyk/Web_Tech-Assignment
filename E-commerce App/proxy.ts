import { NextRequest, NextResponse } from "next/server";
import {
  createContentSecurityPolicy,
  securityHeaders,
} from "@/lib/security/headers";
import { checkRateLimit } from "@/lib/security/rateLimit";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  for (const [name, value] of Object.entries(securityHeaders)) {
    if (name !== "Content-Security-Policy") {
      response.headers.set(name, value);
    }
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const result = checkRateLimit(`${ip}:${request.nextUrl.pathname}`, 100, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            ...securityHeaders,
            "Content-Security-Policy": contentSecurityPolicy,
          },
        },
      );
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
