import type { Metadata } from "next";
import { StationHistory } from "./station-history";

export const metadata: Metadata = { title: "Operator stație" };

export default function OperatorPage() {
  return <StationHistory />;
}
