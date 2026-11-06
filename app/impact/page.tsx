import type { Metadata } from "next";
import { ImpactClient } from "@/components/impact/impact-client";

export const metadata: Metadata = {
  title: "Impactul tău",
};

export default function ImpactPage() {
  return <ImpactClient />;
}
