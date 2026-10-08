"use client";

import { useState } from "react";
import ChartCard from "./ChartCard";
import StreamLegend from "./StreamLegend";
import FullnessBadge from "./FullnessBadge";
import SortButton from "./SortButton";
import HorizontalBarChart, { BarRow } from "./HorizontalBarChart";
import { useDashboardData } from "@/components/DashboardDataProvider";

type Building = { name: string; landfill: number; recycling: number; compost: number; avgFullness: number };

const total = (b: Building) => b.landfill + b.recycling + b.compost;

const SORTS = [
    { key: "pickups-desc",  label: "Pickups: high to low",      short: "Pickups ↓",  compare: (a: Building, b: Building) => total(b) - total(a) },
    { key: "pickups-asc",   label: "Pickups: low to high",      short: "Pickups ↑",  compare: (a: Building, b: Building) => total(a) - total(b) },
    { key: "fullness-desc", label: "Avg fullness: high to low", short: "Avg full ↓", compare: (a: Building, b: Building) => b.avgFullness - a.avgFullness },
    { key: "fullness-asc",  label: "Avg fullness: low to high", short: "Avg full ↑", compare: (a: Building, b: Building) => a.avgFullness - b.avgFullness },
    { key: "name",          label: "Building: A–Z",             short: "A–Z",        compare: (a: Building, b: Building) => a.name.localeCompare(b.name) },
];

export default function PickupsByLocation() {
    const { filteredPickups } = useDashboardData();
    const [sortKey, setSortKey] = useState("pickups-desc");
    const sort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
    const grouped = new Map<string, Building & { fullnessTotal: number; fullnessCount: number }>();
    for (const pickup of filteredPickups) {
        const building = grouped.get(pickup.building) ?? {
            name: pickup.building,
            landfill: 0,
            recycling: 0,
            compost: 0,
            avgFullness: 0,
            fullnessTotal: 0,
            fullnessCount: 0,
        };
        building[pickup.stream.toLowerCase() as "landfill" | "recycling" | "compost"] += 1;
        if (pickup.fullness !== null) {
            building.fullnessTotal += pickup.fullness;
            building.fullnessCount += 1;
        }
        grouped.set(pickup.building, building);
    }
    const sorted = [...grouped.values()]
        .map(({ fullnessTotal, fullnessCount, ...building }) => ({
            ...building,
            avgFullness: fullnessCount ? Math.round(fullnessTotal / fullnessCount) : 0,
        }))
        .sort(sort.compare);

    const rows: BarRow[] = sorted.map((b) => ({
        label: b.name,
        segments: [
        { label: "Landfill",  value: b.landfill,  color: "var(--lf)" },
        { label: "Recycling", value: b.recycling, color: "var(--rc)" },
        { label: "Compost",   value: b.compost,   color: "var(--cp)" },
        ].filter((seg) => seg.value > 0),
        extra: <FullnessBadge percent={b.avgFullness} />,
    }));

    return (
        <ChartCard
        title="Pickups by location"
        subtitle="Pickups per building and average fullness at collection"
        right={
            <div className="card-tools">
            <StreamLegend />
            <SortButton options={SORTS} value={sortKey} onChange={setSortKey} />
            </div>
        }
        >
            <HorizontalBarChart
                labelHeader="Building"
                valueHeader="Pickups"
                extraHeader="Avg full"
                rows={rows}
            />
        </ChartCard>
    );
}
