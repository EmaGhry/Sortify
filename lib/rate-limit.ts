/**
 * Lightweight in-memory rate limiter — zero deps, protects the AI quota from
 * scripted abuse. Per-IP buckets + a global cap, fixed windows.
 *
 * Scope note: on serverless platforms (Vercel) each instance has its own Map,
 * so limits are approximate but still a strong deterrent. For hard guarantees
 * at scale, swap the store for Upstash Redis — the API stays identical.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export interface RateVerdict {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Best-effort client IP (works behind Vercel/proxies). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Blocks cross-origin browser-initiated writes (JSON-CSRF via form POST).
 * Direct API clients (curl) send no Origin and pass; same-origin browser
 * fetches send our own origin and pass; a hostile page's requests are 403'd.
 * Prefers x-forwarded-host so deployments behind rewriting proxies still match.
 */
export function sameOriginOrExternal(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const AI_LIMITS = {
  perIpPerMinute: envInt("AI_RATE_LIMIT_PER_IP", 10),
  // Global backstop: the only defense against x-forwarded-for rotation on
  // self-hosted setups (Vercel overrides XFF itself). High enough that a
  // busy demo day can't hit it; tunable via env.
  globalPerDay: envInt("AI_RATE_LIMIT_GLOBAL", 1000),
  demoPerIpPerMinute: envInt("DEMO_RATE_LIMIT_PER_IP", 60),
  // Direct (unproxied) traffic has no usable client IP — every visitor shares
  // one "unknown" bucket. Used on LAN/self-hosted demos; keep generous.
  directPerMinute: envInt("AI_RATE_LIMIT_DIRECT", 60),
};

/**
 * DNS-rebinding defense, opt-in via APP_ALLOWED_HOSTS (comma-separated, e.g.
 * "localhost:3000,mysite.vercel.app,*.mysite.dev"). Empty = off (LAN demo
 * friendly — a laptop serving 192.168.x.x has no stable host to pin).
 */
export function isAllowedHost(host: string | null): boolean {
  if (!host) return true;
  const allow = (process.env.APP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return true;
  const h = host.toLowerCase();
  return allow.some((pattern) =>
    pattern.startsWith("*.")
      ? h === pattern.slice(2) || h.endsWith(pattern)
      : h === pattern,
  );
}

export function guardHost(req: Request): boolean {
  return isAllowedHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
}
