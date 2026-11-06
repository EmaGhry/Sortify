export type Material =
  | "PLASTIC"
  | "PAPER"
  | "GLASS"
  | "METAL"
  | "ORGANIC"
  | "E_WASTE"
  | "BATTERY"
  | "TEXTILE"
  | "HAZARDOUS"
  | "OTHER";

export const MATERIALS: Material[] = [
  "PLASTIC",
  "PAPER",
  "GLASS",
  "METAL",
  "ORGANIC",
  "E_WASTE",
  "BATTERY",
  "TEXTILE",
  "HAZARDOUS",
  "OTHER",
];

export const STATION_MATERIALS = ["GLASS", "METAL", "PLASTIC", "PAPER", "OTHER"] as const;

export type Language = "ro" | "en" | "de" | "fr" | "it" | "es" | "hu";

export interface LocaleInfo {
  code: Language;
  /** Native display name for the language switcher. */
  native: string;
}

/** Locales Sortify ships with — chosen for the Sibiu / Transylvania tourist mix. */
export const LOCALES: LocaleInfo[] = [
  { code: "ro", native: "Română" },
  { code: "en", native: "English" },
  { code: "de", native: "Deutsch" },
  { code: "hu", native: "Magyar" },
  { code: "fr", native: "Français" },
  { code: "it", native: "Italiano" },
  { code: "es", native: "Español" },
];

/** Enriched response the UI consumes. */
export interface AnalysisResult {
  id: string;
  createdAt: number;
  provider: "team" | "demo";
  demo: boolean;
  /** AI strings are produced in the requested language. */
  itemName: string;
  confidence: number;
  recyclable: boolean;
  reasoning?: string;
  aiTips: string[];
  ecoFact?: string;
  material: Material;
  /** Server-side enrichment (localized). */
  binLabel: string;
  binColor: string;
  instructions: string[];
  co2SavedG: number;
  points: number;
}

export interface StoredScan {
  id: string;
  createdAt: number;
  material: Material;
  itemName: string;
  confidence: number;
  recyclable: boolean;
  co2SavedG: number;
  points: number;
  demo?: boolean;
  thumb?: string; // small JPEG data URL, newest entries only
}

export interface SortifyState {
  scans: StoredScan[];
  badges: string[];
}

export interface SortifyStats {
  total: number;
  recyclableCount: number;
  recyclableRate: number;
  co2TotalG: number;
  pointsTotal: number;
  streakDays: number;
  perMaterial: Record<Material, number>;
  activeDays: number;
}
