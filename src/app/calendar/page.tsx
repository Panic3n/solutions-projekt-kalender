"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarMonth } from "@/components/CalendarMonth";
import type { Consultant, Project } from "@/lib/availability";

function useSettings() {
  const [threshold, setThreshold] = useState<number>(8);
  const [holidays, setHolidays] = useState<string[]>([]);
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem("calendar_threshold") || "8");
      setThreshold(isFinite(t) && t > 0 ? t : 8);
      const h = JSON.parse(localStorage.getItem("calendar_holidays") || "[]");
      setHolidays(Array.isArray(h) ? h : []);
    } catch {}
  }, []);
  return { threshold, holidays };
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { threshold, holidays } = useSettings();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/halopsa/consultants", { cache: "no-store" }),
          fetch("/api/halopsa/projects", { cache: "no-store" }),
        ]);
        const cJson = await cRes.json();
        const pJson = await pRes.json();
        if (cJson?.ok)
          setConsultants((cJson.consultants || []).map((x: any) => ({ id: String(x.id), name: String(x.name || "") })));
        if (pJson?.ok)
          setProjects((pJson.projects || []).map((x: any) => ({
            id: String(x.id),
            customer: x.customer ? String(x.customer) : undefined,
            name: String(x.name || ""),
            type: (x.type === "retainer" || x.type === "request") ? x.type : "scooped",
            budget_hours: Number(x.budget_hours || 0),
            start_date: x.start_date || null,
            end_date: x.end_date || null,
          })));
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const includedIds = useMemo(() => {
    try {
      const raw = localStorage.getItem("included_consultants");
      if (!raw) return new Set(consultants.map((c) => c.id));
      const arr = JSON.parse(raw) as string[];
      if (!Array.isArray(arr) || arr.length === 0) return new Set(consultants.map((c) => c.id));
      return new Set(arr);
    } catch {
      return new Set(consultants.map((c) => c.id));
    }
  }, [consultants]);

  const retainers = useMemo(() => projects.filter(p => p.type === "retainer"), [projects]);
  const requests = useMemo(() => projects.filter(p => p.type === "request"), [projects]);
  const scooped = useMemo(() => projects.filter(p => p.type === "scooped"), [projects]);

  if (loading) return <div className="p-6">Laddar...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projektkalender (detaljerad)</h1>
        <div className="flex items-center gap-2">
          <button className="border rounded px-2 py-1" onClick={() => setMonth((m) => (m === 0 ? (setYear(y=>y-1), 11) : m - 1))}>{"<"}</button>
          <span className="text-sm">{new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
          <button className="border rounded px-2 py-1" onClick={() => setMonth((m) => (m === 11 ? (setYear(y=>y+1), 0) : m + 1))}>{">"}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarMonth
            year={year}
            month={month}
            consultants={consultants}
            projects={projects}
            includedIds={includedIds}
            threshold={threshold}
            holidays={holidays}
          />
        </div>
        <div className="space-y-4">
          <div className="rounded border p-3 bg-white">
            <h2 className="font-medium mb-2">Retainers</h2>
            <div className="space-y-1 max-h-64 overflow-auto">
              {retainers.length === 0 && <div className="text-xs text-zinc-500">Inga retainer-projekt</div>}
              {retainers.map(r => (
                <div key={r.id} className="text-sm flex items-center justify-between">
                  <span title={r.name}>{r.customer ? `${r.customer} – ` : ""}{r.name}</span>
                  <span className="text-xs text-zinc-600">{Math.round(r.budget_hours || 0)} h</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border p-3 bg-white">
            <h2 className="font-medium mb-2">Requests</h2>
            <div className="space-y-1 max-h-64 overflow-auto">
              {requests.length === 0 && <div className="text-xs text-zinc-500">Inga förfrågningar</div>}
              {requests.map(r => (
                <div key={r.id} className="text-sm">
                  {r.customer ? `${r.customer} – ` : ""}{r.name}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border p-3 bg-white">
            <h2 className="font-medium mb-2">Scooped (månadens)</h2>
            <div className="space-y-1 max-h-64 overflow-auto">
              {scooped.length === 0 && <div className="text-xs text-zinc-500">Inga schemalagda projekt</div>}
              {scooped.map(r => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span title={r.name}>{r.customer ? `${r.customer} – ` : ""}{r.name}</span>
                    <span className="text-xs text-zinc-600">{Math.round(r.budget_hours || 0)} h</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {r.start_date ? new Date(r.start_date).toLocaleDateString() : "?"} – {r.end_date ? new Date(r.end_date).toLocaleDateString() : "?"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
