import type { Metadata } from "next";
import { ScanPageClient } from "@/components/scan/scan-page-client";

export const metadata: Metadata = { title: "Scanare / Scan" };

export default function ScanPage() {
  return <ScanPageClient />;
}
