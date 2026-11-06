#!/usr/bin/env node
/**
 * Sortify i18n pipeline (no external deps — plain Node 18+).
 *
 *   node scripts/i18n.mjs validate            # keyless completeness check (CI-safe)
 *   node scripts/i18n.mjs translate [--all] [--lang de,hu] [--dry]
 *
 * translate: fills missing keys in the 5 target dictionaries by AI-translating
 * the EN source (RO included as terminology context) via Gemini. Existing
 * translations are preserved unless --all. Output is validated (every key
 * present, non-empty) before anything is written — review the diff, then commit.
 *
 * Source of truth: locales/dict.en.json (+ dict.ro.json as context).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = join(ROOT, "locales");
const SOURCE = "en";
const CONTEXT = "ro";
const TARGETS = ["de", "hu", "fr", "it", "es"];
const BATCH_SIZE = 40;
/** Keys intentionally identical across all locales (brand strings / universal terms). */
const ALLOW_SAME_AS_SOURCE = new Set(["app.tagline", "common.xp"]);

const NATIVE_NAMES = { de: "German", hu: "Hungarian", fr: "French", it: "Italian", es: "Spanish" };

const SYSTEM_PROMPT = `You are the official localizer of Sortify, an AI recycling assistant for Romania / the EU. You translate product strings from English into the requested target language.

Domain rules:
- Guidance always refers to the ROMANIAN / EU collection system (yellow bin = plastic & metal packaging, blue = paper, green = glass, brown = organic, plus special drop-offs for e-waste, batteries, textiles, hazardous waste). Translate the meaning; never swap in another country's system.
- Keep brand/technical tokens verbatim: Sortify, PET, HDPE, PP, AA, AAA, XP, CO2, JPG, PNG, WebP, .env.local, GOOGLE_AI_API_KEY, OPENAI_API_KEY, Pyrex.
- Keep symbols and separators exactly: ◆, →, —, –, ×, %, numbers, and Roman numerals.
- Keep the tone: short, imperative, friendly product copy. No explanations, no quotes around values.
- Match punctuation conventions of the target language (e.g. Spanish ¿…?, French narrow spaces before ? and !).

Output ONLY minified JSON: {"<key>": "<translation>", ...} with every requested key.`;

// ── helpers ──────────────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function readDict(lang) {
  const p = join(LOCALES_DIR, `dict.${lang}.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function orderLike(source, dict) {
  const out = {};
  for (const k of Object.keys(source)) out[k] = dict[k] ?? source[k];
  for (const k of Object.keys(dict)) if (!(k in out)) out[k] = dict[k];
  return out;
}

function parseJsonLoose(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return JSON.parse(cleaned);
}

async function callGemini(apiKey, model, userPayload) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPayload }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 8192, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Gemini HTTP ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return parseJsonLoose(text);
}

// ── modes ────────────────────────────────────────────────────────────────────

function validate() {
  const source = readDict(SOURCE);
  const sourceKeys = Object.keys(source).sort();
  let problems = 0;

  for (const lang of ["ro", ...TARGETS]) {
    const p = join(LOCALES_DIR, `dict.${lang}.json`);
    if (!existsSync(p)) {
      console.error(`✗ dict.${lang}.json — MISSING FILE`);
      problems++;
      continue;
    }
    let dict;
    try {
      dict = readDict(lang);
    } catch (e) {
      console.error(`✗ dict.${lang}.json — invalid JSON: ${e.message}`);
      problems++;
      continue;
    }
    const keys = Object.keys(dict).sort();
    const missing = sourceKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !sourceKeys.includes(k));
    const empty = sourceKeys.filter((k) => typeof dict[k] !== "string" || dict[k].trim() === "");
    const sameAsSource = SOURCE !== lang && lang !== CONTEXT
      ? sourceKeys.filter((k) => !ALLOW_SAME_AS_SOURCE.has(k) && dict[k] === source[k]).length
      : 0;

    if (missing.length) {
      console.error(`✗ dict.${lang}.json — missing ${missing.length} key(s): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`);
      problems++;
    }
    if (extra.length) {
      console.error(`✗ dict.${lang}.json — ${extra.length} unknown key(s): ${extra.slice(0, 8).join(", ")}${extra.length > 8 ? "…" : ""}`);
      problems++;
    }
    if (empty.length) {
      console.error(`✗ dict.${lang}.json — ${empty.length} empty value(s): ${empty.slice(0, 8).join(", ")}${empty.length > 8 ? "…" : ""}`);
      problems++;
    }
    if (sameAsSource > 0) {
      console.warn(`! dict.${lang}.json — ${sameAsSource} value(s) identical to the EN source (possible untranslated leftovers)`);
    }
    if (!missing.length && !extra.length && !empty.length) {
      console.log(`✓ dict.${lang}.json — ${keys.length} keys, complete`);
    }
  }

  console.log(problems === 0 ? "\nAll dictionaries complete." : `\n${problems} problem(s) found.`);
  process.exit(problems === 0 ? 0 : 1);
}

async function translate(args) {
  const dry = args.includes("--dry");
  const all = args.includes("--all");
  const langArg = args.find((a) => a.startsWith("--lang="));
  const langs = langArg ? langArg.split("=")[1].split(",").filter((l) => TARGETS.includes(l)) : TARGETS;
  if (langs.length === 0) langs.push(...TARGETS);

  loadEnvLocal();
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error(
      "✗ GOOGLE_AI_API_KEY not set.\n" +
      "  Add it to .env.local (https://aistudio.google.com/apikey — free tier), then re-run:\n" +
      "    npm run i18n:translate",
    );
    process.exit(1);
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const source = readDict(SOURCE);
  const context = readDict(CONTEXT);
  const sourceKeys = Object.keys(source);
  let hadFailures = false;

  for (const lang of langs) {
    const p = join(LOCALES_DIR, `dict.${lang}.json`);
    const existing = existsSync(p) ? readDict(lang) : {};
    const todo = sourceKeys.filter((k) => all || typeof existing[k] !== "string" || existing[k].trim() === "");
    console.log(`\n[${lang}] ${todo.length} key(s) to translate (${sourceKeys.length - todo.length} kept)`);

    if (todo.length === 0) continue;

    const collected = {};
    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      const batch = todo.slice(i, i + BATCH_SIZE);
      const payload = JSON.stringify({
        target_language: NATIVE_NAMES[lang],
        strings: batch.map((k) => ({ key: k, en: source[k], ro: context[k] })),
      });
      let out = {};
      try {
        out = await callGemini(apiKey, model, payload);
        await new Promise((r) => setTimeout(r, 300)); // polite pacing
      } catch (e) {
        console.error(`  batch ${i / BATCH_SIZE + 1}: call failed — ${e.message}`);
        hadFailures = true;
        continue;
      }

      const good = batch.filter((k) => typeof out[k] === "string" && out[k].trim() !== "");
      for (const k of good) collected[k] = out[k].trim();
      const missing = batch.filter((k) => !good.includes(k));

      // one strict retry for missing keys in this batch
      if (missing.length) {
        try {
          const retryPayload = JSON.stringify({
            target_language: NATIVE_NAMES[lang],
            strings: missing.map((k) => ({ key: k, en: source[k], ro: context[k] })),
            note: "These keys were missing from your previous response. Return ALL of them.",
          });
          const retry = await callGemini(apiKey, model, retryPayload);
          for (const k of missing) {
            if (typeof retry[k] === "string" && retry[k].trim() !== "") collected[k] = retry[k].trim();
          }
        } catch {
          /* fall through to failure reporting */
        }
      }

      const stillMissing = batch.filter((k) => !(k in collected));
      if (stillMissing.length) {
        console.error(`  ✗ ${stillMissing.length} key(s) unresolved after retry: ${stillMissing.slice(0, 5).join(", ")}${stillMissing.length > 5 ? "…" : ""}`);
        hadFailures = true;
      }
      console.log(`  batch ${i / BATCH_SIZE + 1}: ${good.length}/${batch.length} ok`);
    }

    const translatedCount = Object.keys(collected).length;
    if (dry) {
      console.log(`  [dry-run] would write ${translatedCount} key(s) to dict.${lang}.json`);
      continue;
    }
    const merged = orderLike(source, { ...existing, ...collected });
    writeFileSync(p, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`  wrote dict.${lang}.json (${translatedCount} new / ${sourceKeys.length} total)`);
  }

  console.log(hadFailures ? "\nDone with failures — re-run to retry, then npm run i18n:validate." : "\nDone. Run npm run i18n:validate, review the diff, then commit.");
  process.exit(hadFailures ? 1 : 0);
}

// ── entry ────────────────────────────────────────────────────────────────────

const [mode, ...args] = process.argv.slice(2);
if (mode === "validate") {
  validate();
} else if (mode === "translate") {
  translate(args).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.log("Usage: node scripts/i18n.mjs validate | translate [--all] [--lang=de,hu] [--dry]");
  process.exit(1);
}
