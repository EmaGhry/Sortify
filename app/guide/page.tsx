import type { Metadata } from "next";
import { GuideClient } from "@/components/guide/guide-client";

export const metadata: Metadata = {
  title: "Ghid de reciclare",
};

export default function GuidePage() {
  return <GuideClient />;
}
