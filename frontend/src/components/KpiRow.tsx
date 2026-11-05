"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/KpiCard";
import { useDashboardData } from "@/components/DashboardDataProvider";

export default function KpiRow() {
    const { filteredPickups, filteredSchedule, dataSource } = useDashboardData();
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        const updateNow = () => setNow(Date.now());
        updateNow();
        const timer = window.setInterval(updateNow, 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const dueSchedule = now === null ? [] : filteredSchedule.filter((service) =>
        new Date(service.scheduledAt).getTime() <= now,
    );
    const missed = dueSchedule.filter((service) =>
        !service.fulfilled && !service.pickupId,
    ).length;
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
    const missedRate = dueSchedule.length
        ? Math.round((missed / dueSchedule.length) * 100)
        : 0;

    const available = (dataSource === "api" || dataSource === "demo");
    return (
        <section className="kpis" aria-label="Pickup summary">
            <KpiCard
                label="Total pickups"
                value={available ? String(filteredPickups.length) : "—"}
                sub={available ? `of ${filteredSchedule.length} scheduled services` : "Server offline"}
                color="var(--accent)"
            />
            <KpiCard
                label="Total missed"
                value={available ? String(missed) : "—"}
                sub={available ? `${missedRate}% of due scheduled services` : "Server offline"}
                color="var(--crit)"
            />
            <KpiCard
                label="Under 50% full"
                value={available ? String(underHalf) : "—"}
                sub={available ? `${fullnessValues.length ? Math.round((underHalf / fullnessValues.length) * 100) : 0}% of pickups with fullness recorded` : "Server offline"}
                color="var(--warn)"
            />
            <KpiCard
                label="Avg fullness"
                value={available ? String(averageFullness) : "—"}
                unit={available ? "%" : undefined}
                sub={available ? "of pickups with fullness recorded" : "Server offline"}
                color="var(--ink-2)"
            />
            <KpiCard
                label="Contamination"
                value={available ? String(contaminationRate) : "—"}
                unit={available ? "%" : undefined}
                sub={available ? `${contaminated} contaminated pickups` : "Server offline"}
                color="var(--serious)"
            />
        </section>
    );
}
