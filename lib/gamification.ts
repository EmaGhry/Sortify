import type { Language, SortifyStats, StoredScan } from "./types";
import { pick } from "./translations";

export interface Level {
  min: number;
  name: Record<Language, string>;
}

export const LEVELS: Level[] = [
  { min: 0, name: pick("level.0") },
  { min: 50, name: pick("level.1") },
  { min: 150, name: pick("level.2") },
  { min: 300, name: pick("level.3") },
  { min: 600, name: pick("level.4") },
  { min: 1000, name: pick("level.5") },
];

export function levelFor(points: number): { level: Level; next: Level | null; progress: number } {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) idx = i;
  }
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (points - level.min) / (next.min - level.min) : 1;
  return { level, next, progress };
}

export function streakBonus(streakDays: number): number {
  return Math.min(streakDays, 7);
}

export interface BadgeDef {
  id: string;
  name: Record<Language, string>;
  desc: Record<Language, string>;
  icon:
    | "sparkles"
    | "recycle"
    | "leaf"
    | "flame"
    | "crown"
    | "target"
    | "star"
    | "trophy"
    | "zap"
    | "cpu"
    | "battery"
    | "globe"
    | "medal";
  test: (scans: StoredScan[], stats: SortifyStats) => boolean;
}

const BADGE_META: Array<{ id: string; icon: BadgeDef["icon"]; test: BadgeDef["test"] }> = [
  { id: "first_scan", icon: "sparkles", test: (s) => s.length >= 1 },
  { id: "scan_10", icon: "recycle", test: (s) => s.length >= 10 },
  { id: "scan_50", icon: "crown", test: (s) => s.length >= 50 },
  { id: "plastic_5", icon: "recycle", test: (s) => count(s, "PLASTIC") >= 5 },
  { id: "paper_5", icon: "leaf", test: (s) => count(s, "PAPER") >= 5 },
  { id: "glass_5", icon: "star", test: (s) => count(s, "GLASS") >= 5 },
  { id: "metal_5", icon: "zap", test: (s) => count(s, "METAL") >= 5 },
  { id: "e_waste_1", icon: "cpu", test: (s) => count(s, "E_WASTE") >= 1 },
  { id: "battery_1", icon: "battery", test: (s) => count(s, "BATTERY") >= 1 },
  { id: "streak_3", icon: "flame", test: (_s, stats) => stats.streakDays >= 3 },
  { id: "streak_7", icon: "flame", test: (_s, stats) => stats.streakDays >= 7 },
  { id: "co2_1000", icon: "medal", test: (_s, stats) => stats.co2TotalG >= 1000 },
  { id: "explorer", icon: "globe", test: (s) => new Set(s.map((x) => x.material)).size >= 5 },
];

export const BADGES: BadgeDef[] = BADGE_META.map(({ id, icon, test }) => ({
  id,
  icon,
  name: pick(`badge.${id}.name`),
  desc: pick(`badge.${id}.desc`),
  test,
}));

function count(scans: StoredScan[], material: string): number {
  return scans.filter((s) => s.material === material).length;
}

/** Returns ids of badges now unlocked but not previously stored. */
export function evaluateNewBadges(scans: StoredScan[], stats: SortifyStats, owned: string[]): string[] {
  return BADGES.filter((b) => b.test(scans, stats) && !owned.includes(b.id)).map((b) => b.id);
}
