import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SortifyState, StoredScan } from "@shared/types";
import { MATERIALS } from "@shared/types";

/**
 * AsyncStorage mirror of the web localStorage persistence (sortify:v1).
 * Stats/streak math is reused from @shared/storage (pure functions).
 */
const KEY = "sortify:v1";
const MAX_SCANS = 300;
const MAX_THUMBS = 60;

const EMPTY: SortifyState = { scans: [], badges: [] };

function isValidScan(s: unknown): s is StoredScan {
  if (typeof s !== "object" || s === null) return false;
  const scan = s as Record<string, unknown>;
  return (
    typeof scan.id === "string" &&
    typeof scan.createdAt === "number" &&
    typeof scan.material === "string" &&
    (MATERIALS as string[]).includes(scan.material)
  );
}

export async function loadState(): Promise<SortifyState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SortifyState>;
    const scans = Array.isArray(parsed.scans) ? parsed.scans.filter(isValidScan) : [];
    const badges = Array.isArray(parsed.badges) ? parsed.badges.filter((b) => typeof b === "string") : [];
    return { scans, badges };
  } catch {
    return EMPTY;
  }
}

async function persist(state: SortifyState): Promise<void> {
  try {
    const trimmed: SortifyState = {
      ...state,
      scans: state.scans.slice(0, MAX_SCANS).map((s, i) =>
        i >= MAX_THUMBS && s.thumb ? { ...s, thumb: undefined } : s,
      ),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // quota — retry once without thumbnails
    try {
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({ ...state, scans: state.scans.slice(0, MAX_SCANS).map((s) => ({ ...s, thumb: undefined })) }),
      );
    } catch {
      /* give up silently */
    }
  }
}

export async function saveScan(
  state: SortifyState,
  scan: StoredScan,
  badges: string[],
): Promise<SortifyState> {
  const next: SortifyState = { scans: [scan, ...state.scans].slice(0, MAX_SCANS), badges };
  await persist(next);
  return next;
}

/** Persists an already-computed full state (used by the app-state provider). */
export async function persistState(state: SortifyState): Promise<void> {
  await persist(state);
}

export async function deleteScan(state: SortifyState, id: string): Promise<SortifyState> {
  const next: SortifyState = { ...state, scans: state.scans.filter((s) => s.id !== id) };
  await persist(next);
  return next;
}

export async function clearAll(): Promise<SortifyState> {
  await persist(EMPTY);
  return EMPTY;
}
