import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult, SortifyState, SortifyStats, StoredScan } from "@shared/types";
import { computeStats, hasScannedToday } from "@shared/storage";
import { BADGES, evaluateNewBadges, streakBonus } from "@shared/gamification";
import { uid } from "@shared/utils";
import {
  loadState,
  persistState,
  deleteScan as persistDelete,
  clearAll as persistClear,
} from "@/lib/storage";

/**
 * Shared app state (scan history + badges) — AsyncStorage-backed, mirrors
 * the web localStorage model. Stats/streak math reused from @shared.
 */

interface AppStateValue {
  state: SortifyState;
  stats: SortifyStats;
  loaded: boolean;
  /** Persists a scan, evaluates badges; returns newly unlocked badge ids. */
  commit: (result: AnalysisResult, thumb?: string) => string[];
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue>({
  state: { scans: [], badges: [] },
  stats: {
    total: 0,
    recyclableCount: 0,
    recyclableRate: 0,
    co2TotalG: 0,
    pointsTotal: 0,
    streakDays: 0,
    perMaterial: {} as never,
    activeDays: 0,
  },
  loaded: false,
  commit: () => [],
  remove: async () => {},
  clear: async () => {},
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SortifyState>({ scans: [], badges: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setLoaded(true);
    });
  }, []);

  const stats = useMemo(() => computeStats(state.scans), [state.scans]);

  const commit = useCallback(
    (result: AnalysisResult, thumb?: string): string[] => {
      const points = result.demo
        ? result.points
        : result.points + streakBonus(stats.streakDays + (hasScannedToday(state.scans) ? 0 : 1));
      const scan: StoredScan = {
        id: uid("scan"),
        createdAt: Date.now(),
        material: result.material,
        itemName: result.itemName,
        confidence: result.confidence,
        recyclable: result.recyclable,
        co2SavedG: result.co2SavedG,
        points,
        demo: result.demo,
        thumb,
      };
      const candidateScans = [scan, ...state.scans];
      const candidateStats = computeStats(candidateScans);
      const newBadges = evaluateNewBadges(candidateScans, candidateStats, state.badges);
      const next: SortifyState = { scans: candidateScans, badges: [...state.badges, ...newBadges] };
      setState(next);
      void persistState(next);
      return newBadges;
    },
    [state, stats.streakDays],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = await persistDelete(state, id);
      setState(next);
    },
    [state],
  );

  const clear = useCallback(async () => {
    const next = await persistClear();
    setState(next);
  }, []);

  return (
    <AppStateContext.Provider value={{ state, stats, loaded, commit, remove, clear }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}

/** Badge display name by id, for toasts. */
export function badgeName(id: string): string {
  return BADGES.find((b) => b.id === id)?.id ?? id;
}
