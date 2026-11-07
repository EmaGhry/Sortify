"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CircuitBoard, ClipboardList, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const copy = {
  ro: {
    eyebrow: "Sortify Station · ByteForce",
    title: "O stație care alege unde merge ambalajul.",
    introduction: "Pentru cantine și zone de pauză. Camera recunoaște obiectul, iar ESP32 indică destinația de colectare.",
    kiosk: "Deschide stația",
    operator: "Vezi panoul operatorului",
    local: "Stația și panoul folosesc serviciul local de pe PC-ul conectat la montaj.",
    concept: "Conceptul aparatului final",
    imageAlt: "Randare a stației Sortify cu o gură de introducere și ecran, într-o cantină.",
    prototype: "Prototipul de banc funcționează cu o cameră, cinci LED-uri și un servo care indică destinația. Carcasa și compartimentele fac parte din concept.",
    flow: "Cum funcționează stația",
    steps: [
      ["01", "Prezintă ambalajul", "Camera captează obiectul când stă nemișcat în zona de scanare."],
      ["02", "Identifică materialul", "Modelul AI clasifică ambalajul. ESP32 primește materialul și indică destinația cu LED și servo."],
      ["03", "Verifică rezultatul", "Operatorul vede scanările, obiectele neacceptate și confirmările plăcii."],
    ],
    materials: ["Sticlă", "Metal", "PET / plastic", "Hârtie / carton", "Altele"],
    scanner: "Scanează un obiect cu telefonul",
  },
  en: {
    eyebrow: "Sortify Station · ByteForce",
    title: "A station that knows where packaging goes.",
    introduction: "For canteens and break rooms. The camera recognizes each item and the ESP32 indicates its collection destination.",
    kiosk: "Open station",
    operator: "View operator panel",
    local: "The station and operator panel use the local service on the PC connected to the hardware.",
    concept: "Finished station concept",
    imageAlt: "Concept rendering of the Sortify station with an intake and screen in a canteen.",
    prototype: "The bench prototype uses a camera, five LEDs, and a servo to point to the destination. The enclosure and compartments are part of the concept.",
    flow: "How the station works",
    steps: [
      ["01", "Present the packaging", "The camera captures the item once it holds still in the scanning area."],
      ["02", "Identify the material", "The AI classifies the item. The ESP32 receives the material and indicates its destination with an LED and servo."],
      ["03", "Check the outcome", "The operator can review scans, rejected items, and acknowledgements from the board."],
    ],
    materials: ["Glass", "Metal", "PET / plastic", "Paper / cardboard", "Other"],
    scanner: "Scan an item with your phone",
  },
};

const icons = [Camera, CircuitBoard, ClipboardList];
const materialColors = ["#4ade80", "#f87171", "#facc15", "#60a5fa", "#f8fafc"];

export function StationHome() {
  const { lang } = useI18n();
  const language = lang === "ro" ? "ro" : "en";
  const content = copy[language];

  return (
    <div lang={language} className="mx-auto max-w-[1200px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
      <section className="paper-sheet grid overflow-hidden border-[1.5px] border-ink text-ink shadow-hard lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12">
          <p className="font-semibold text-xs uppercase tracking-wider text-leaf">{content.eyebrow}</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-[1.03] tracking-tight sm:text-5xl xl:text-6xl">{content.title}</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">{content.introduction}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/kiosk" className="btn-press inline-flex items-center gap-2 border-[1.5px] border-ink bg-leaf-deep px-5 py-3 text-sm font-bold text-paper shadow-hard-sm hover:bg-leaf">
              {content.kiosk}<ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href="/operator" className="btn-press border-[1.5px] border-ink bg-paper2 px-4 py-3 text-sm font-bold shadow-hard-sm hover:bg-paper">{content.operator}</Link>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-soft">{content.local}</p>
        </div>
        <figure className="relative min-h-60 border-t-[1.5px] border-ink sm:min-h-80 lg:border-l-[1.5px] lg:border-t-0">
          <Image src="/station-concept.png" alt={content.imageAlt} fill preload
            sizes="(min-width: 1280px) 610px, (min-width: 1024px) 52vw, 100vw"
            className="object-cover object-center" />
          <figcaption className="absolute bottom-3 left-3 border-[1.5px] border-ink bg-paper2 px-3 py-2 font-mono text-xs text-ink">{content.concept}</figcaption>
        </figure>
      </section>

      <section className="mt-10" aria-labelledby="station-flow">
        <h2 id="station-flow" className="font-display text-3xl tracking-tight">{content.flow}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{content.prototype}</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {content.steps.map(([number, title, description], index) => {
            const Icon = icons[index];
            return (
              <li key={number} className="card-print p-5 shadow-hard-sm">
                <div className="flex items-center justify-between text-leaf">
                  <Icon aria-hidden className="size-5" />
                  <span className="font-mono text-xs">{number}</span>
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-ink/25 py-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          {content.materials.map((material, index) => (
            <li key={material} className="inline-flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full border border-ink/50" style={{ backgroundColor: materialColors[index] }} />
              {material}
            </li>
          ))}
        </ul>
        <Link href="/scan" className="inline-flex items-center gap-2 text-sm font-bold text-leaf underline underline-offset-4">
          <ScanLine aria-hidden className="size-4" />{content.scanner}
        </Link>
      </div>
    </div>
  );
}
