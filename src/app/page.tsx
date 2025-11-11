"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarMonth } from "@/components/CalendarMonth";
import type { Consultant, Project } from "@/lib/availability";

export default function Home() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (cJson?.ok) setConsultants((cJson.consultants || []).map((x: any) => ({ id: String(x.id), name: String(x.name || "") })));
        if (pJson?.ok) setProjects((pJson.projects || []).map((x: any) => ({
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

  if (loading) return <div className="p-6">Laddar...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projektkalender</h1>
        <div className="flex items-center gap-2">
          <button className="border rounded px-2 py-1" onClick={() => setMonth((m) => (m === 0 ? (setYear(y=>y-1), 11) : m - 1))}>{"<"}</button>
          <span className="text-sm">{new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
          <button className="border rounded px-2 py-1" onClick={() => setMonth((m) => (m === 11 ? (setYear(y=>y+1), 0) : m + 1))}>{">"}</button>
        </div>
      </div>
      <p className="text-sm text-gray-600">Utloggad vy visar endast kalendermånad med röd/grön tillgänglighet.</p>

      <CalendarMonth
        year={year}
        month={month}
        consultants={consultants}
        projects={projects}
        includedIds={includedIds}
        threshold={8}
      />
    </div>
  );
}
