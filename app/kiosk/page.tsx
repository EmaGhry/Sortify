import type { Metadata } from "next";
import { BenchKiosk } from "./bench-kiosk";

export const metadata: Metadata = { title: "Stație de banc" };

export default function KioskPage() {
  return <BenchKiosk />;
}
