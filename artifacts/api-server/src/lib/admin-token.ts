import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const PAYLOAD_SUFFIX = ":nx_admin_session";

/**
 * Creates a short-lived HMAC-SHA256 signed token.
 * Format: `<timestamp_ms>.<hmac_hex>`
 * The token expires after TOKEN_TTL_MS and is invalidated if the password changes.
 */
export function signAdminToken(password: string): string {
  const ts = Date.now().toString();
  const sig = hmac(password, ts + PAYLOAD_SUFFIX);
  return `${ts}.${sig}`;
}

/**
 * Verifies a token produced by signAdminToken.
 * Returns true if the signature is valid and the token has not expired.
 */
export function verifyAdminToken(token: string, password: string): boolean {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const timestamp = Number(ts);

  if (!Number.isFinite(timestamp)) return false;
  if (Date.now() - timestamp > TOKEN_TTL_MS) return false;

  const expected = hmac(password, ts + PAYLOAD_SUFFIX);

  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function hmac(key: string, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}
