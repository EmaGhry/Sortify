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
} from "lucide-react";
import type { Material } from "@/lib/types";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { cn } from "@/lib/utils";

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

export function MaterialIcon({
  material,
  size = "md",
  className,
}: {
  material: Material;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = MATERIAL_ICONS[material];
  const color = MATERIAL_PROFILES[material].bin.color;
  const sizes = { sm: "size-8", md: "size-10", lg: "size-12" }[size];
  const iconSizes = { sm: "size-4", md: "size-5", lg: "size-6" }[size];

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md border-[1.5px] border-ink",
        sizes,
        className,
      )}
      style={{ backgroundColor: `${color}30`, color: "#1c2b21" }}
    >
      <Icon className={iconSizes} strokeWidth={2} />
    </span>
  );
}
