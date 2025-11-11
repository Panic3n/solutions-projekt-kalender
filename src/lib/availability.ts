export type Consultant = { id: string; name: string; hoursPerDay?: number };
export type Project = {
  id: string;
  customer?: string;
  name: string;
  type: "scooped" | "retainer" | "request";
  budget_hours?: number; // total budget
  start_date?: string | null;
  end_date?: string | null;
};

export type DayAlloc = { date: string; booked: number; capacity: number; available: number };

export function getMonthDays(year: number, month: number): string[] {
  const d0 = new Date(year, month, 1);
  const days: string[] = [];
  while (d0.getMonth() === month) {
    days.push(d0.toISOString().slice(0, 10));
    d0.setDate(d0.getDate() + 1);
  }
  return days;
}

export function isBusinessDay(iso: string, holidays?: Set<string>): boolean {
  const d = new Date(iso + "T00:00:00");
  const wd = d.getDay();
  const weekday = wd !== 0 && wd !== 6; // Mon-Fri
  if (!weekday) return false;
  if (holidays && holidays.has(iso)) return false;
  return true;
}

export function distributeEvenly(total: number, days: string[]): Record<string, number> {
  if (total <= 0 || days.length === 0) return {};
  const per = total / days.length;
  const map: Record<string, number> = {};
  days.forEach((d) => (map[d] = per));
  return map;
}

export function calcAvailability(
  year: number,
  month: number,
  consultants: Consultant[],
  projects: Project[],
  includedConsultantIds: Set<string>,
  defaultHoursPerDay = 8,
  holidaysList: string[] = []
): DayAlloc[] {
  const holidays = new Set(holidaysList);
  const monthDays = getMonthDays(year, month).filter((d) => isBusinessDay(d, holidays));
  // Capacity
  const totalDailyCapacity = consultants
    .filter((c) => includedConsultantIds.has(c.id))
    .reduce((acc, c) => acc + (c.hoursPerDay ?? defaultHoursPerDay), 0);

  // Scooped bookings: distribute budget across [start..end] intersection with month
  const scooped = projects.filter((p) => p.type === "scooped" && p.start_date && p.end_date);
  const allocations: Record<string, number> = {};
  for (const p of scooped) {
    const start = new Date(p.start_date as string);
    const end = new Date(p.end_date as string);
    const period: string[] = [];
    for (const d of monthDays) {
      const dt = new Date(d + "T00:00:00");
      if (dt >= start && dt <= end) period.push(d);
    }
    const businessPeriod = period.filter((d) => isBusinessDay(d, holidays));
    const map = distributeEvenly(p.budget_hours || 0, businessPeriod);
    for (const day of Object.keys(map)) allocations[day] = (allocations[day] || 0) + map[day];
  }

  // Retainer deduction: spread evenly across all business days of the month
  const retainers = projects.filter((p) => p.type === "retainer");
  const retainerTotal = retainers.reduce((acc, r) => acc + (r.budget_hours || 0), 0);
  const retainerMap = distributeEvenly(retainerTotal, monthDays);

  // Build outputs
  return monthDays.map((d) => {
    const booked = (allocations[d] || 0) + (retainerMap[d] || 0);
    const capacity = totalDailyCapacity;
    return { date: d, booked, capacity, available: Math.max(0, capacity - booked) };
  });
}
