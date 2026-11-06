import type { Metadata } from "next";
import { HistoryClient } from "@/components/history/history-client";

export const metadata: Metadata = {
  title: "Istoric scanări",
};

export default function HistoryPage() {
  return <HistoryClient />;
}
