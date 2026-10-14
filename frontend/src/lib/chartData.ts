import type { PickupRecord } from "../types/pickup";
import type { ScheduleRecord } from "../types/dashboard";

export type ChartPoint = { label: string; detail: string; values: (number | null)[] };
const DAY = 86_400_000;
const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

// Calendar grouping uses UTC, matching the dashboard's existing date filters.
export function pickupTrend(pickups: PickupRecord[], schedule: ScheduleRecord[], start: string, end: string, now: number) {
    const dates = [...pickups.map((p) => p.collectedAt.slice(0, 10)), ...schedule.map((s) => s.scheduledAt.slice(0, 10))].sort();
    const from = Date.parse(`${start || dates[0]}T00:00:00Z`);
    const to = Date.parse(`${end || dates.at(-1)}T00:00:00Z`);
    const days = (to - from) / DAY + 1;
    const interval = days > 180 ? "Monthly" : days > 45 ? "Weekly" : "Daily";
    if (!Number.isFinite(days) || days <= 0) return { interval, points: [] as ChartPoint[] };
    const key = (time: number) => interval === "Monthly"
        ? new Date(time).toISOString().slice(0, 7)
        : String(Math.floor((time - from) / (DAY * (interval === "Weekly" ? 7 : 1))));
    const buckets = new Map<string, ChartPoint>();
    for (let time = from; time <= to; ) {
        const date = new Date(time);
        const label = interval === "Monthly" ? monthLabel.format(date) : dateLabel.format(date);
        buckets.set(key(time), { label, detail: `${interval === "Weekly" ? "Week of " : ""}${label}`, values: [0, 0] });
        if (interval === "Monthly") time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
        else time += DAY * (interval === "Weekly" ? 7 : 1);
    }
    for (const pickup of pickups) {
        const time = Date.parse(pickup.collectedAt);
        const point = time >= from && time < to + DAY ? buckets.get(key(time)) : undefined;
        if (point) point.values[0] = (point.values[0] ?? 0) + 1;
    }
    for (const service of schedule) {
        const time = Date.parse(service.scheduledAt);
        if (time > now || service.fulfilled || service.pickupId) continue;
        const point = time >= from && time < to + DAY ? buckets.get(key(time)) : undefined;
        if (point) point.values[1] = (point.values[1] ?? 0) + 1;
    }
    return { interval, points: [...buckets.values()] };
}

export function weekdayFullness(pickups: PickupRecord[]): ChartPoint[] {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => {
        const values = pickups.filter((p) => (new Date(p.collectedAt).getUTCDay() + 6) % 7 === index)
            .map((p) => p.fullness).filter((v): v is number => v !== null && Number.isFinite(v));
        return { label, detail: `${label} · ${values.length} readings`, values: [values.length ? values.reduce((a, b) => a + b, 0) / values.length : null] };
    });
}

// Illustrative monthly expenses only. Never infer real expenditure from pickup counts.
export const DEMO_COST_YEARS = [2024, 2025, 2026];
export function demoMonthlyCosts(buildings: string[], year: number): ChartPoint[] {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, month) => ({
        label, detail: `${label} ${year}`,
        values: [buildings.reduce((sum, building) => {
            const seed = [...building].reduce((n, c) => n + c.charCodeAt(0), 0);
            return sum + Math.round((650 + seed % 950) * [1.02, .94, 1.08, 1.06, .98, .74, .69, .92, 1.16, 1.12, 1.03, .82][month] * (1 + (year - 2024) * .045));
        }, 0)],
    }));
}

// One illustrative primary contaminant per flagged pickup; counts reconcile to the real flag total.
export function demoContaminants(pickups: PickupRecord[]) {
    const counts = [0, 0, 0, 0];
    for (const pickup of pickups.filter((p) => p.contaminated)) {
        const seed = [...pickup.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
        counts[seed % counts.length]++;
    }
    return ["Food / liquids", "Plastic film", "Wrong-stream items", "Other materials"].map((label, i) => ({ label, value: counts[i] }));
}
