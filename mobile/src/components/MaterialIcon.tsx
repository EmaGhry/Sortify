import { View } from "react-native";
import {
  Apple,
  BatteryCharging,
  Biohazard,
  CupSoda,
  Cpu,
  Magnet,
  Newspaper,
  Shirt,
  Trash2,
  Wine,
  type LucideIcon,
} from "lucide-react-native";
import type { Material } from "@shared/types";
import { MATERIAL_PROFILES } from "@shared/materials";
import { C } from "@/theme";

export const MATERIAL_ICONS: Record<Material, LucideIcon> = {
  PLASTIC: CupSoda,
  PAPER: Newspaper,
  GLASS: Wine,
  METAL: Magnet,
  ORGANIC: Apple,
  E_WASTE: Cpu,
  BATTERY: BatteryCharging,
  TEXTILE: Shirt,
  HAZARDOUS: Biohazard,
  OTHER: Trash2,
};

/** hex (#RRGGBB) + alpha(0..1) -> rgba() string. */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function MaterialIcon({
  material,
  size = "md",
}: {
  material: Material;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = MATERIAL_ICONS[material];
  const color = MATERIAL_PROFILES[material].bin.color;
  const box = { sm: 32, md: 40, lg: 48 }[size];
  const icon = { sm: 16, md: 20, lg: 24 }[size];

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: C.ink,
        backgroundColor: hexA(color, 0.25),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={icon} color={C.ink} strokeWidth={2} />
    </View>
  );
}
