"use client";

import { useEffect, useState } from "react";
import type { Consultant } from "@/lib/availability";

export default function AdminPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [map, setMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(8);
  const [holidaysText, setHolidaysText] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/halopsa/consultants", { cache: "no-store" });
        const json = await res.json();
        if (json?.ok) {
          const rows = (json.consultants || []).map((x: any) => ({ id: String(x.id), name: String(x.name || "") }));
          setConsultants(rows);
          // load from localStorage
          const raw = localStorage.getItem("included_consultants");
          const arr = raw ? (JSON.parse(raw) as string[]) : [];
          const selected: Record<string, boolean> = {};
          if (arr.length) arr.forEach((id) => (selected[id] = true));
          else rows.forEach((c: any) => (selected[c.id] = true)); // default all included
          setMap(selected);

          // settings
          const t = Number(localStorage.getItem("calendar_threshold") || "8");
          setThreshold(isFinite(t) && t > 0 ? t : 8);
          const h = JSON.parse(localStorage.getItem("calendar_holidays") || "[]");
          if (Array.isArray(h)) setHolidaysText(h.join("\n"));
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load consultants");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = () => {
    const ids = Object.keys(map).filter((k) => !!map[k]);
    localStorage.setItem("included_consultants", JSON.stringify(ids));
    // settings
    const t = isFinite(threshold) && threshold > 0 ? threshold : 8;
    localStorage.setItem("calendar_threshold", String(t));
    const holidays = holidaysText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    localStorage.setItem("calendar_holidays", JSON.stringify(holidays));
    alert("Saved included consultants");
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="text-sm text-gray-600">Välj vilka konsulter som tas med i tillgänglighetsberäkningen.</p>
      <div className="flex gap-2">
        <button className="border rounded px-3 py-1" onClick={() => {
          const all: Record<string, boolean> = {}; consultants.forEach((c)=> all[c.id] = true); setMap(all);
        }}>Select all</button>
        <button className="border rounded px-3 py-1" onClick={() => setMap({})}>Select none</button>
        <button className="border rounded px-3 py-1 bg-black text-white" onClick={save}>Save</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded">
        {consultants.map((c) => (
          <label key={c.id} className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!map[c.id]} onChange={(e)=> setMap((s)=> ({ ...s, [c.id]: e.target.checked }))} />
            <span>{c.name}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded border p-3 bg-white">
          <h2 className="font-medium mb-2">Gräns för grön dag (timmar)</h2>
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-32"
            value={threshold}
            onChange={(e)=> setThreshold(Number(e.target.value))}
          />
          <div className="text-xs text-zinc-500 mt-1">Används som tröskelvärde för att markera dagar som gröna.</div>
        </div>
        <div className="rounded border p-3 bg-white">
          <h2 className="font-medium mb-2">Helgdagar (YYYY-MM-DD, en per rad)</h2>
          <textarea
            className="border rounded p-2 w-full h-40"
            placeholder="2025-12-25\n2025-12-26"
            value={holidaysText}
            onChange={(e)=> setHolidaysText(e.target.value)}
          />
          <div className="text-xs text-zinc-500 mt-1">Dessa dagar exkluderas från beräkningen.</div>
        </div>
      </div>
    </div>
  );
}
