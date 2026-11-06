import type { Language, SortifyState, SortifyStats, StoredScan, Material } from "./types";
import { MATERIALS } from "./types";

// Malformed/corrupt localStorage entries must never white-screen a page
// (verified: an entry with an unknown `material` crashed the History view).

const KEY = "sortify:v1";
const MAX_SCANS = 300;
const MAX_THUMBS = 60; // keep thumbnails only on newest entries (localStorage quota)

const EMPTY: SortifyState = { scans: [], badges: [] };

export function loadState(): SortifyState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SortifyState>;
    const scans = Array.isArray(parsed.scans) ? parsed.scans.filter(isValidScan) : [];
    const badges = Array.isArray(parsed.badges) ? parsed.badges.filter((b) => typeof b === "string") : [];
    return { scans, badges };
  } catch {
    return EMPTY;
  }
}

function isValidScan(s: unknown): s is StoredScan {
  if (typeof s !== "object" || s === null) return false;
  const scan = s as Record<string, unknown>;
  return (
    typeof scan.id === "string" &&
    typeof scan.createdAt === "number" &&
    typeof scan.material === "string" &&
    MATERIALS.includes(scan.material as Material)
  );
}

function persist(state: SortifyState): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed: SortifyState = {
      ...state,
      scans: state.scans.slice(0, MAX_SCANS).map((s, i) =>
        i >= MAX_THUMBS && s.thumb ? { ...s, thumb: undefined } : s,
      ),
    };
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded — drop thumbnails and retry once.
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ ...state, scans: state.scans.slice(0, MAX_SCANS).map((s) => ({ ...s, thumb: undefined })) }),
      );
    } catch {
      /* give up silently */
    }
  }
}

export function saveScan(state: SortifyState, scan: StoredScan, badges: string[]): SortifyState {
  const next: SortifyState = { scans: [scan, ...state.scans].slice(0, MAX_SCANS), badges };
  persist(next);
  return next;
}

export function deleteScan(state: SortifyState, id: string): SortifyState {
  const next: SortifyState = { ...state, scans: state.scans.filter((s) => s.id !== id) };
  persist(next);
  return next;
}

export function clearAll(): SortifyState {
  persist(EMPTY);
  return EMPTY;
}

export function computeStats(scans: StoredScan[]): SortifyStats {
  const perMaterial = Object.fromEntries(MATERIALS.map((m) => [m, 0])) as Record<Material, number>;
  let recyclableCount = 0;
  let co2TotalG = 0;
  let pointsTotal = 0;
  const days = new Set<string>();

  for (const scan of scans) {
    perMaterial[scan.material] = (perMaterial[scan.material] ?? 0) + 1;
    if (scan.recyclable) recyclableCount++;
    co2TotalG += scan.co2SavedG;
    pointsTotal += scan.points;
    days.add(new Date(scan.createdAt).toDateString());
  }

  return {
    total: scans.length,
    recyclableCount,
    recyclableRate: scans.length ? recyclableCount / scans.length : 0,
    co2TotalG,
    pointsTotal,
    streakDays: computeStreak(days),
    perMaterial,
    activeDays: days.size,
  };
}

function computeStreak(days: Set<string>): number {
  const day = new Date();
  // Streak counts today only if scanned today; otherwise starts from yesterday.
  if (!days.has(day.toDateString())) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(day.toDateString())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function hasScannedToday(scans: StoredScan[]): boolean {
  const today = new Date().toDateString();
  return scans.some((s) => new Date(s.createdAt).toDateString() === today);
}

export type { Language };
