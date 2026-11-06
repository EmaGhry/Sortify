import type { Language } from "./types";
import { pick } from "./translations";

/**
 * Rough public-source conversion factors used only for friendly "equivalents"
 * copy. They are illustrative, not an LCA audit.
 */
export const CO2_FACTORS = {
  gramsPerKmCar: 170,
  gramsPerPhoneCharge: 8.2,
  gramsPerTreeDay: 58, // ~21 kg CO2 / tree / year
};

export interface Co2Equivalent {
  id: "car" | "charge" | "tree";
  icon: "car" | "smartphone" | "tree";
  value: number;
  label: Record<Language, string>;
}

export function co2Equivalents(co2G: number): Co2Equivalent[] {
  if (co2G <= 0) return [];
  const eqs: Co2Equivalent[] = [
    {
      id: "car",
      icon: "car",
      value: Math.round((co2G / CO2_FACTORS.gramsPerKmCar) * 10) / 10,
      label: pick("equivalent.car"),
    },
    {
      id: "charge",
      icon: "smartphone",
      value: Math.round(co2G / CO2_FACTORS.gramsPerPhoneCharge),
      label: pick("equivalent.charge"),
    },
    {
      id: "tree",
      icon: "tree",
      value: Math.round((co2G / CO2_FACTORS.gramsPerTreeDay) * 10) / 10,
      label: pick("equivalent.tree"),
    },
  ];
  return eqs.filter((e) => e.value >= 0.1);
}
