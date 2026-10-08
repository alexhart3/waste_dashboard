"use client";

import KpiCard from "@/components/KpiCard";
import { useDashboardData } from "@/components/DashboardDataProvider";

export default function KpiRow() {
    const { filteredPickups, filteredSchedule } = useDashboardData();
    const missed = filteredSchedule.filter((service) => !service.fulfilled).length;
    const fullnessValues = filteredPickups
        .map((pickup) => pickup.fullness)
        .filter((value): value is number => value !== null);
    const averageFullness = fullnessValues.length
        ? Math.round(fullnessValues.reduce((total, value) => total + value, 0) / fullnessValues.length)
        : 0;
    const underHalf = fullnessValues.filter((value) => value < 50).length;
    const contaminated = filteredPickups.filter((pickup) => pickup.contaminated).length;
    const contaminationRate = filteredPickups.length
        ? Math.round((contaminated / filteredPickups.length) * 100)
        : 0;
    const missedRate = filteredSchedule.length
        ? Math.round((missed / filteredSchedule.length) * 100)
        : 0;

    return (
        <section className="kpis" aria-label="Pickup summary">
            <KpiCard
                label="Total pickups"
                value={String(filteredPickups.length)}
                sub={`of ${filteredSchedule.length} scheduled services`}
                color="var(--accent)"
            />
            <KpiCard
                label="Total missed"
                value={String(missed)}
                sub={`${missedRate}% of scheduled services`}
                color="var(--crit)"
            />
            <KpiCard
                label="Under 50% full"
                value={String(underHalf)}
                sub={`${filteredPickups.length ? Math.round((underHalf / filteredPickups.length) * 100) : 0}% of pickups with fullness recorded`}
                color="var(--warn)"
            />
            <KpiCard
                label="Avg fullness"
                value={String(averageFullness)}
                unit="%"
                sub="of pickups with fullness recorded"
                color="var(--ink-2)"
            />
            <KpiCard
                label="Contamination"
                value={String(contaminationRate)}
                unit="%"
                sub={`${contaminated} contaminated pickups`}
                color="var(--serious)"
            />
        </section>
    );
}
