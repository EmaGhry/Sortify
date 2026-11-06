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
  return (
    <section lang="ro" className="mx-auto my-8 max-w-6xl bg-[#10221a] p-5 text-white sm:p-10">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-300">Sortify · Operator</p>
          <h1 className="mt-2 text-3xl font-bold">Istoricul stației</h1>
        </div>
        <Link href="/kiosk" className="border border-white/25 px-4 py-3 text-sm font-bold hover:bg-white/10">Înapoi la cameră</Link>
      </header>
      {error && <p role="alert" className="mb-4 text-amber-200">{error}</p>}
      {summary ? (
        <>
          <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Scanări AI", summary.total],
              ["Comenzi confirmate", summary.acknowledged],
              ["Comenzi neconfirmate", summary.unconfirmed],
              ["Obiecte neacceptate", summary.rejected],
              ["Previzualizări", summary.previews],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/25 p-3">
                <dt className="text-sm text-emerald-100">{label}</dt>
                <dd className="text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-3 text-sm text-emerald-100">Ultimele 50 de scanări. Confirmarea ESP32 indică setarea ieșirilor.</p>
          {snapshot.events.length === 0 ? <p>Încă nu sunt scanări salvate.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-white/30 text-emerald-100">
                    {["Oră", "Rezultat", "Scor", "Durată", "Stare"].map((label) => <th className="p-3" key={label} scope="col">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.events.map((event) => (
                    <tr key={event.id} className="border-b border-white/15">
                      <td className="p-3">{timeFormat.format(new Date(event.created_at))}</td>
                      <td className="p-3">{materials[event.destination]}</td>
                      <td className="p-3">{Math.round(event.score * 100)}%</td>
                      <td className="p-3">{event.elapsed_ms} ms</td>
                      <td className="p-3">{acknowledgements[event.hardware]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : snapshot ? <p>Istoricul este disponibil cu un model AI activ.</p> : !error && <p>Se încarcă istoricul…</p>}
    </section>
  );
}
