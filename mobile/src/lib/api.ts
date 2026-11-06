import * as Constants from "expo-constants";
import type { AnalysisResult, Language } from "@shared/types";

/**
 * Base URL of the Sortify backend (repo-root Next.js app). The AI key lives
 * server-side; the app only ever talks to these endpoints.
 *
 * Priority: EXPO_PUBLIC_API_URL (env) → LAN host of the machine running
 * `expo start` (Expo Go dev, same-wifi demo) → localhost.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, "");
  }
  // Expo Go / dev-client runtime: hostUri is "192.168.x.x:8081" while `expo start` runs.
  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { hostUri?: string };
  };
  const hostUri = constants.expoConfig?.hostUri ?? constants.expoGoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0];
  if (host && host.length > 0 && host !== "localhost") {
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

export const API_BASE = resolveApiBase();

export type ApiErrorCode =
  | "NO_PROVIDER"
  | "RATE_LIMIT"
  | "TOO_LARGE"
  | "BAD_TYPE"
  | "FORBIDDEN"
  | "PROVIDER"
  | "OFFLINE"
  | "GENERIC";

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode) {
    super(code);
    this.code = code;
  }
}

const CODE_MAP: Record<number | string, ApiErrorCode> = {
  400: "GENERIC",
  403: "FORBIDDEN",
  413: "TOO_LARGE",
  415: "BAD_TYPE",
  429: "RATE_LIMIT",
  503: "NO_PROVIDER",
  502: "PROVIDER",
};

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    // fetch-level failure: server unreachable / DNS / timeout
    throw new ApiError("OFFLINE");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const serverCode = typeof data.error === "string" ? data.error : res.status;
    throw new ApiError(CODE_MAP[serverCode] ?? "GENERIC");
  }
  return data as T;
}

export async function analyzeImage(
  imageBase64: string,
  language: Language,
): Promise<AnalysisResult> {
  return post<AnalysisResult>(
    "/api/analyze",
    { image: imageBase64, mimeType: "image/jpeg", language },
    45_000,
  );
}

export async function fetchStatus(): Promise<{ live: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { live: false };
    const data = (await res.json()) as { live?: boolean };
    return { live: Boolean(data.live) };
  } catch {
    return { live: false };
  }
}

export const ERROR_KEYS: Record<ApiErrorCode, string> = {
  NO_PROVIDER: "error.noProvider",
  RATE_LIMIT: "error.rateLimit",
  TOO_LARGE: "error.tooLarge",
  BAD_TYPE: "error.badType",
  FORBIDDEN: "error.generic",
  PROVIDER: "error.provider",
  OFFLINE: "error.provider",
  GENERIC: "error.generic",
};
