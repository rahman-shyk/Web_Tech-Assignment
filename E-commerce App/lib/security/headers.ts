const scriptSources =
  process.env.NODE_ENV === "production"
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment = process.env.NODE_ENV !== "production",
): string {
  const developmentScriptSource = isDevelopment ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptSource}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    `default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; ${scriptSources}`,
};
