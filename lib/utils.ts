import { clsx, type ClassValue } from "clsx";
import type { Language } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = "s"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Downscale an image data URL to fit within `maxSide`, JPEG-compressed. */
export function downscaleImage(dataUrl: string, maxSide: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = dataUrl;
  });
}

/** "acum 3 min" / "3 min ago" style formatter, localized per locale. */
export function timeAgo(ts: number, lang: Language): string {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  switch (lang) {
    case "ro":
      if (min < 1) return "chiar acum";
      if (min < 60) return `acum ${min} min`;
      if (hr < 24) return `acum ${hr} h`;
      return `acum ${day} z`;
    case "de":
      if (min < 1) return "gerade eben";
      if (min < 60) return `vor ${min} Min.`;
      if (hr < 24) return `vor ${hr} Std.`;
      return `vor ${day} T.`;
    case "hu":
      if (min < 1) return "éppen most";
      if (min < 60) return `${min} perce`;
      if (hr < 24) return `${hr} órája`;
      return `${day} napja`;
    case "fr":
      if (min < 1) return "à l'instant";
      if (min < 60) return `il y a ${min} min`;
      if (hr < 24) return `il y a ${hr} h`;
      return `il y a ${day} j`;
    case "it":
      if (min < 1) return "proprio ora";
      if (min < 60) return `${min} min fa`;
      if (hr < 24) return `${hr} h fa`;
      return `${day} g fa`;
    case "es":
      if (min < 1) return "ahora mismo";
      if (min < 60) return `hace ${min} min`;
      if (hr < 24) return `hace ${hr} h`;
      return `hace ${day} d`;
    default:
      if (min < 1) return "just now";
      if (min < 60) return `${min}m ago`;
      if (hr < 24) return `${hr}h ago`;
      return `${day}d ago`;
  }
}

export function formatGrams(g: number, _lang?: Language): string {
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(1)} t`;
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
  return `${Math.round(g)} g`;
}
