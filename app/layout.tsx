import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar, MobileTabbar, Ticker } from "@/components/navbar";
import { BackgroundFX } from "@/components/background-fx";
import { Recycle } from "lucide-react";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sortify — Asistent AI pentru reciclare",
    template: "%s · Sortify",
  },
  description:
    "Scan it. Sort it. Save the planet. Sortify recunoaște obiectele reciclabile dintr-o fotografie și îți spune exact cum și unde le sortezi.",
  applicationName: "Sortify",
  authors: [{ name: "ByteForce" }],
  keywords: ["reciclare", "AI", "ecologie", "sortare deșeuri", "recycling", "hackathon"],
  openGraph: {
    title: "Sortify — Asistent AI pentru reciclare",
    description: "Scanează. Sortează. Salvează planeta.",
    siteName: "Sortify",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f1e9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${fraunces.variable} ${jbmono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          <BackgroundFX />
          <Navbar />
          <Ticker />
          <MobileTabbar />
          <main className="flex-1 w-full">{children}</main>
          <footer className="border-t-[1.5px] border-ink mt-14">
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <Recycle className="size-3.5 text-leaf" />
                Sortify — ByteForce
              </span>
              <span>Scan it. Sort it. Save the planet.</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
