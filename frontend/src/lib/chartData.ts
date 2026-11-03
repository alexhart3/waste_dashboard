import type { PickupRecord } from "../types/pickup";
import type { CollectionCostRecord, ScheduleRecord } from "../types/dashboard";

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

// Sum stored cents before converting to dollars. Missing months stay blank.
export function monthlyCosts(costs: CollectionCostRecord[], year: number, building = ""): ChartPoint[] {
    const totals = new Map<number, number>();
    for (const cost of costs) {
        if (Number(cost.month.slice(0, 4)) !== year || (building && cost.building !== building)) continue;
        const month = Number(cost.month.slice(5, 7)) - 1;
        totals.set(month, (totals.get(month) ?? 0) + cost.amountCents);
    }
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, month) => ({
        label, detail: `${label} ${year}`,
        values: [totals.has(month) ? totals.get(month)! / 100 : null],
    }));
}

// One primary category per flagged pickup keeps the pie slices non-overlapping.
export function contaminantBreakdown(pickups: PickupRecord[]) {
    const counts = new Map<string, number>();
    for (const pickup of pickups) {
        if (!pickup.contaminated) continue;
        const category = pickup.contaminationCategory?.trim() || "Unknown";
        counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}
