import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  createContentSecurityPolicy,
  securityHeaders,
} from "@/lib/security/headers";

describe("security foundations", () => {
  it("enforces an in-memory rate limit", () => {
    const key = `test-${Date.now()}`;
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(false);
  });

  it("provides baseline security headers", () => {
    expect(securityHeaders["X-Content-Type-Options"]).toBe("nosniff");
    expect(securityHeaders["Content-Security-Policy"]).toContain("default-src");
  });

  it("allows only nonce-authorized production scripts in the CSP", () => {
    const policy = createContentSecurityPolicy("test-nonce", false);
    expect(policy).toContain("'nonce-test-nonce'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
