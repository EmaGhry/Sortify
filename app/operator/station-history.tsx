"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const materials = {
  glass: "Sticlă",
  metal: "Metal",
  plastic: "PET / plastic",
  paper: "Hârtie / carton",
  reject: "Altele",
};
/** Aceleași culori ca LED-urile stației (vezi kiosk). */
const colors: Record<keyof typeof materials, string> = {
  glass: "#4ade80",
  metal: "#f87171",
  plastic: "#facc15",
  paper: "#60a5fa",
  reject: "#f8fafc",
};
const acknowledgements = {
  acknowledged: "Comandă confirmată",
  unconfirmed: "Comandă neconfirmată",
  disabled: "Previzualizare",
};
type Event = {
  id: number;
  created_at: string;
  destination: keyof typeof materials;
  score: number;
  elapsed_ms: number;
  hardware: keyof typeof acknowledgements;
};
type Snapshot = {
  summary: { total: number; previews: number; rejected: number; unconfirmed: number; acknowledged: number } | null;
  events: Event[];
};
const timeFormat = new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "medium" });

export function StationHistory() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        const response = await fetch("/api/bench?view=history", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setSnapshot(data);
          setError(null);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Istoricul local nu este disponibil.");
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(update, 3000);
      }
    }
    void update();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const summary = snapshot?.summary;
  const events = snapshot?.events ?? [];
  const recycled = summary ? summary.total - summary.rejected : 0;
  const average = (pick: (event: Event) => number) =>
    events.length ? events.reduce((sum, event) => sum + pick(event), 0) / events.length : null;
  const avgScore = average((event) => event.score);
  const avgTime = average((event) => event.elapsed_ms);
  const counts = (Object.keys(materials) as (keyof typeof materials)[])
    .map((key) => ({ key, count: events.filter((event) => event.destination === key).length }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const card = "paper-sheet border-[1.5px] border-ink shadow-hard-sm";

  return (
    <section lang="ro" className="mx-auto max-w-[1200px] px-4 py-8 text-ink sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-leaf">Sortify · Operator</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">Statisticile stației</h1>
          <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-ink-soft">
            <span aria-hidden className={`size-2 rounded-full ${error ? "bg-danger" : "bg-leaf animate-pulse-soft"}`} />
            {error ? "Fără conexiune la serviciul local" : "Live · actualizare la 3 secunde"}
          </p>
        </div>
        <Link href="/kiosk" className="btn-press border-[1.5px] border-ink bg-leaf-deep px-5 py-3 text-sm font-bold text-paper shadow-hard-sm hover:bg-leaf">
          Înapoi la stație
        </Link>
      </header>
      {error && <p role="alert" className={`${card} mb-6 border-danger p-4 text-sm font-bold text-danger`}>{error}</p>}
      {summary ? (
        <>
          <dl className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["Scanări AI", summary.total, `${summary.previews} previzualizări`],
              ["Rată de reciclare", summary.total ? `${Math.round((recycled / summary.total) * 100)}%` : "–", `${summary.rejected} obiecte neacceptate`],
              ["Încredere medie", avgScore === null ? "–" : `${Math.round(avgScore * 100)}%`, "ultimele scanări"],
              ["Confirmări ESP32", summary.acknowledged, `${summary.unconfirmed} neconfirmate`],
            ].map(([label, value, note]) => (
              <div key={label} className={`${card} p-4 sm:p-5`}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">{label}</dt>
                <dd className="mt-2 font-display text-4xl leading-none sm:text-5xl">{value}</dd>
                <dd className="mt-2 text-xs text-ink-soft">{note}</dd>
              </div>
            ))}
          </dl>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={`${card} p-5`}>
              <h2 className="font-display text-2xl">Pe containere</h2>
              <p className="mt-1 text-xs text-ink-soft">Din ultimele {events.length} scanări</p>
              <ul className="mt-5 space-y-4">
                {counts.map(({ key, count }) => (
                  <li key={key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 font-bold">
                        <span aria-hidden className="size-3 rounded-full border border-ink" style={{ background: colors[key] }} />
                        {materials[key]}
                      </span>
                      <span className="font-mono text-xs">{count}</span>
                    </div>
                    <div className="mt-1.5 h-3 border-[1.5px] border-ink bg-paper">
                      <div className="h-full border-r-[1.5px] border-ink" style={{ width: `${(count / maxCount) * 100}%`, background: colors[key] }} />
                    </div>
                  </li>
                ))}
              </ul>
              {avgTime !== null && (
                <p className="mt-6 border-t hairline pt-4 font-mono text-xs text-ink-soft">
                  Timp mediu de răspuns: {Math.round(avgTime)} ms
                </p>
              )}
            </div>

            <div className={`${card} p-5`}>
              <h2 className="font-display text-2xl">Ultimele scanări</h2>
              <p className="mt-1 text-xs text-ink-soft">Ultimele 50. Confirmarea ESP32 indică setarea ieșirilor.</p>
              {events.length === 0 ? <p className="mt-6 text-sm">Încă nu sunt scanări salvate.</p> : (
                <div className="mt-4 max-h-[28rem] overflow-auto">
                  <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="sticky top-0 bg-paper2">
                      <tr className="border-b-[1.5px] border-ink font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                        {["Oră", "Rezultat", "Scor", "Durată", "Stare"].map((label) => <th className="px-2 py-2.5" key={label} scope="col">{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b hairline">
                          <td className="px-2 py-2.5 font-mono text-xs">{timeFormat.format(new Date(event.created_at))}</td>
                          <td className="px-2 py-2.5">
                            <span className="inline-flex items-center gap-2">
                              <span aria-hidden className="size-2.5 rounded-full border border-ink" style={{ background: colors[event.destination] }} />
                              {materials[event.destination]}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 font-mono text-xs">{Math.round(event.score * 100)}%</td>
                          <td className="px-2 py-2.5 font-mono text-xs">{event.elapsed_ms} ms</td>
                          <td className={`px-2 py-2.5 text-xs font-bold ${event.hardware === "unconfirmed" ? "text-danger" : event.hardware === "acknowledged" ? "text-leaf" : "text-ink-soft"}`}>
                            {acknowledgements[event.hardware]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : snapshot ? <p className={`${card} p-5`}>Istoricul este disponibil cu un model AI activ.</p>
        : !error && <p className={`${card} p-5 font-mono text-sm text-ink-soft animate-pulse-soft`}>Se încarcă istoricul…</p>}
    </section>
  );
}
