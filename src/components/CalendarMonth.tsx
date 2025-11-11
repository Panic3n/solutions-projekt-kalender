"use client";

import { useMemo } from "react";
import { calcAvailability, Consultant, Project } from "@/lib/availability";

export function CalendarMonth({
  year,
  month,
  consultants,
  projects,
  includedIds,
  threshold = 8,
  holidays = [],
}: {
  year: number;
  month: number; // 0..11
  consultants: Consultant[];
  projects: Project[];
  includedIds: Set<string>;
  threshold?: number; // hours threshold for green day
  holidays?: string[];
}) {
  const days = useMemo(() => {
    const scoopedAndRetainers = projects.filter(p => p.type === "scooped" || p.type === "retainer");
    return calcAvailability(year, month, consultants, scoopedAndRetainers, includedIds, 8, holidays);
  }, [year, month, consultants, projects, includedIds, holidays]);

  const firstDay = new Date(year, month, 1).getDay();
  const leading = (firstDay + 6) % 7; // make Monday=0

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 text-xs font-medium text-zinc-600 border-b bg-zinc-50">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((w, i) => (
          <div key={`w-${i}`} className="px-2 py-2 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-200">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`l-${i}`} className="h-24 bg-zinc-100" />
        ))}
        {days.map((d) => {
          const date = new Date(d.date);
          const green = d.available >= threshold;
          return (
            <div key={d.date} className={green ? "h-24 bg-emerald-50" : "h-24 bg-rose-50"}>
              <div className="h-full w-full border border-white/60 rounded-sm p-2 flex flex-col">
                <div className="text-[11px] text-zinc-500">{date.getDate()}</div>
                <div className="mt-auto flex items-center gap-1 text-[10px]">
                  <span className="px-1 py-0.5 rounded bg-zinc-900 text-white">{Math.round(d.available)} free</span>
                  <span className="px-1 py-0.5 rounded bg-zinc-200 text-zinc-800">{Math.round(d.booked)} booked</span>
                  <span className="px-1 py-0.5 rounded bg-zinc-200 text-zinc-800">{Math.round(d.capacity)} cap</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
