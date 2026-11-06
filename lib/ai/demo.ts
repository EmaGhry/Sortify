import type { AnalysisResult, Language, Material } from "../types";
import { MATERIAL_PROFILES } from "../materials";
import { pick, pickList } from "../translations";
import { uid } from "../utils";

interface DemoItem {
  material: Material;
  confidence: number;
  recyclable: boolean;
}

const DEMO_ITEMS: DemoItem[] = [
  { material: "PLASTIC", confidence: 0.94, recyclable: true },
  { material: "METAL", confidence: 0.96, recyclable: true },
  { material: "PAPER", confidence: 0.9, recyclable: true },
  { material: "GLASS", confidence: 0.92, recyclable: true },
  { material: "BATTERY", confidence: 0.89, recyclable: true },
];

function enrichDemo(item: DemoItem, language: Language): AnalysisResult {
  const profile = MATERIAL_PROFILES[item.material];
  const prefix = `demo.${item.material}`;
  return {
    id: uid("demo"),
    createdAt: Date.now(),
    provider: "demo",
    demo: true,
    itemName: pick(`${prefix}.itemName`)[language],
    confidence: item.confidence,
    recyclable: item.recyclable,
    reasoning: pick(`${prefix}.reasoning`)[language],
    aiTips: pickList(`${prefix}.tip`, 2)[language],
    ecoFact: pick(`${prefix}.ecoFact`)[language],
    material: item.material,
    binLabel: profile.bin.label[language],
    binColor: profile.bin.color,
    instructions: profile.instructions[language],
    co2SavedG: item.recyclable ? profile.co2PerItemG : 0,
    points: 10 + (item.recyclable ? 10 : 0),
  };
}

/** Returns a canned demo result, avoiding repeats via the `pick` hint. */
export function demoResult(language: Language, pickHint?: Material): AnalysisResult {
  if (pickHint && DEMO_ITEMS.some((d) => d.material === pickHint)) {
    const item = DEMO_ITEMS.find((d) => d.material === pickHint)!;
    return enrichDemo(item, language);
  }
  const idx = Math.floor(Math.random() * DEMO_ITEMS.length);
  return enrichDemo(DEMO_ITEMS[idx], language);
}
