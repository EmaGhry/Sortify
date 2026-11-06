import type { Language, Material } from "./types";
import { pick, pickList } from "./translations";

export interface Bin {
  label: Record<Language, string>;
  /** Tailwind-free raw hex, used inline for chips. */
  color: string;
}

export interface MaterialProfile {
  id: Material;
  label: Record<Language, string>;
  bin: Bin;
  instructions: Record<Language, string[]>;
  dos: Record<Language, string[]>;
  donts: Record<Language, string[]>;
  /** Estimated CO2-equivalent saved (grams) per correctly sorted typical item. */
  co2PerItemG: number;
  description: Record<Language, string>;
}

/**
 * Knowledge base grounded in EU / Romanian household waste streams.
 * Guidance always refers to the Romanian collection system, rendered in the
 * selected language — so a tourist learns the local system, in their language.
 * All strings come from `locales/dict.{lang}.json` via the i18n pipeline.
 * Estimates are deliberately conservative and labeled as such in the UI.
 */
export const MATERIAL_PROFILES: Record<Material, MaterialProfile> = {
  PLASTIC: {
    id: "PLASTIC",
    label: pick("material.PLASTIC.label"),
    bin: { label: pick("material.PLASTIC.bin"), color: "#FACC15" },
    instructions: pickList("material.PLASTIC.instruction", 4),
    dos: pickList("material.PLASTIC.do", 3),
    donts: pickList("material.PLASTIC.dont", 3),
    co2PerItemG: 80,
    description: pick("material.PLASTIC.description"),
  },
  PAPER: {
    id: "PAPER",
    label: pick("material.PAPER.label"),
    bin: { label: pick("material.PAPER.bin"), color: "#60A5FA" },
    instructions: pickList("material.PAPER.instruction", 3),
    dos: pickList("material.PAPER.do", 3),
    donts: pickList("material.PAPER.dont", 3),
    co2PerItemG: 60,
    description: pick("material.PAPER.description"),
  },
  GLASS: {
    id: "GLASS",
    label: pick("material.GLASS.label"),
    bin: { label: pick("material.GLASS.bin"), color: "#4ADE80" },
    instructions: pickList("material.GLASS.instruction", 3),
    dos: pickList("material.GLASS.do", 3),
    donts: pickList("material.GLASS.dont", 3),
    co2PerItemG: 90,
    description: pick("material.GLASS.description"),
  },
  METAL: {
    id: "METAL",
    label: pick("material.METAL.label"),
    bin: { label: pick("material.METAL.bin"), color: "#FACC15" },
    instructions: pickList("material.METAL.instruction", 3),
    dos: pickList("material.METAL.do", 3),
    donts: pickList("material.METAL.dont", 3),
    co2PerItemG: 130,
    description: pick("material.METAL.description"),
  },
  ORGANIC: {
    id: "ORGANIC",
    label: pick("material.ORGANIC.label"),
    bin: { label: pick("material.ORGANIC.bin"), color: "#B45309" },
    instructions: pickList("material.ORGANIC.instruction", 3),
    dos: pickList("material.ORGANIC.do", 3),
    donts: pickList("material.ORGANIC.dont", 3),
    co2PerItemG: 20,
    description: pick("material.ORGANIC.description"),
  },
  E_WASTE: {
    id: "E_WASTE",
    label: pick("material.E_WASTE.label"),
    bin: { label: pick("material.E_WASTE.bin"), color: "#F87171" },
    instructions: pickList("material.E_WASTE.instruction", 4),
    dos: pickList("material.E_WASTE.do", 3),
    donts: pickList("material.E_WASTE.dont", 3),
    co2PerItemG: 1200,
    description: pick("material.E_WASTE.description"),
  },
  BATTERY: {
    id: "BATTERY",
    label: pick("material.BATTERY.label"),
    bin: { label: pick("material.BATTERY.bin"), color: "#A78BFA" },
    instructions: pickList("material.BATTERY.instruction", 3),
    dos: pickList("material.BATTERY.do", 3),
    donts: pickList("material.BATTERY.dont", 3),
    co2PerItemG: 150,
    description: pick("material.BATTERY.description"),
  },
  TEXTILE: {
    id: "TEXTILE",
    label: pick("material.TEXTILE.label"),
    bin: { label: pick("material.TEXTILE.bin"), color: "#F472B6" },
    instructions: pickList("material.TEXTILE.instruction", 3),
    dos: pickList("material.TEXTILE.do", 3),
    donts: pickList("material.TEXTILE.dont", 3),
    co2PerItemG: 1500,
    description: pick("material.TEXTILE.description"),
  },
  HAZARDOUS: {
    id: "HAZARDOUS",
    label: pick("material.HAZARDOUS.label"),
    bin: { label: pick("material.HAZARDOUS.bin"), color: "#EF4444" },
    instructions: pickList("material.HAZARDOUS.instruction", 3),
    dos: pickList("material.HAZARDOUS.do", 3),
    donts: pickList("material.HAZARDOUS.dont", 3),
    co2PerItemG: 100,
    description: pick("material.HAZARDOUS.description"),
  },
  OTHER: {
    id: "OTHER",
    label: pick("material.OTHER.label"),
    bin: { label: pick("material.OTHER.bin"), color: "#9CA3AF" },
    instructions: pickList("material.OTHER.instruction", 3),
    dos: pickList("material.OTHER.do", 2),
    donts: pickList("material.OTHER.dont", 2),
    co2PerItemG: 0,
    description: pick("material.OTHER.description"),
  },
};

export function profileOf(material: Material): MaterialProfile {
  return MATERIAL_PROFILES[material] ?? MATERIAL_PROFILES.OTHER;
}
