import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import {
  FraudShield,
  getClientIP,
  RATE_LIMITS,
} from "@/lib/fraud-shield";
import { generateRequestId } from "@/lib/security-headers";

// ═══════════════════════════════════════════════════════════════
// Middleware — Auth + Global Rate Limiting + Request Tracing
// ═══════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  const requestId = generateRequestId();

  // ── Global rate limit: 100 req/min per IP ──
  const globalCheck = FraudShield.checkRateLimit(
    `global:${ip}`,
    RATE_LIMITS.global
  );
  if (!globalCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      route: pathname,
      details: { limit: "global", hits: globalCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 50,
    });

    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down.",
        retryAfter: Math.ceil(globalCheck.resetMs / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(globalCheck.resetMs / 1000)),
          "X-Request-Id": requestId,
        },
      }
    );
  }

  // ── API-specific rate limit: 30 req/min per IP for /api/* ──
  if (pathname.startsWith("/api")) {
    const apiCheck = FraudShield.checkRateLimit(
      `api:${ip}`,
      RATE_LIMITS.api
    );
    if (!apiCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "rate_limit",
        severity: "medium",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        route: pathname,
        details: { limit: "api", hits: apiCheck.totalHits },
        actionTaken: "rate_limited",
        riskScore: 55,
      });

      return new NextResponse(
        JSON.stringify({
          error: "API rate limit exceeded. Please try again shortly.",
          retryAfter: Math.ceil(apiCheck.resetMs / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(apiCheck.resetMs / 1000)),
            "X-Request-Id": requestId,
          },
        }
      );
    }
  }

  // ── Supabase auth session refresh ──
  const response = await createClient(request);

  // ── Attach tracing and security headers ──
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
