"use client";

import { useState } from "react";
import ChartCard from "./ChartCard";
import SortButton from "./SortButton";
import HorizontalBarChart, { BarRow } from "./HorizontalBarChart";
import { useDashboardData } from "@/components/DashboardDataProvider";

type Bin = { building: string; binId: string; overflows: number };

const SORTS = [
    { key: "overflows-desc", label: "Overflows: high to low", short: "Overflows ↓", compare: (a: Bin, b: Bin) => b.overflows - a.overflows },
    { key: "overflows-asc", label: "Overflows: low to high", short: "Overflows ↑", compare: (a: Bin, b: Bin) => a.overflows - b.overflows },
    { key: "building", label: "Building: A–Z", short: "Building", compare: (a: Bin, b: Bin) => a.building.localeCompare(b.building) },
    { key: "bin", label: "Bin ID: A–Z", short: "Bin ID", compare: (a: Bin, b: Bin) => a.binId.localeCompare(b.binId) },
];

export default function OverflowByBin() {
    const { filteredPickups } = useDashboardData();
    const [sortKey, setSortKey] = useState("overflows-desc");
    const sort = SORTS.find((option) => option.key === sortKey) ?? SORTS[0];
    const grouped = new Map<string, Bin>();

    for (const pickup of filteredPickups) {
        if (!pickup.overflow) continue;
        const key = `${pickup.building}:${pickup.binId}`;
        const bin = grouped.get(key) ?? { building: pickup.building, binId: pickup.binId, overflows: 0 };
        bin.overflows += 1;
        grouped.set(key, bin);
    }

    const rows: BarRow[] = [...grouped.values()].sort(sort.compare).map((bin) => ({
        label: <>{bin.building} – <span className="mono">{bin.binId}</span></>,
        segments: [{ label: "Overflows", value: bin.overflows, color: "var(--crit)" }],
    }));

    return (
        <ChartCard
            title="Overflow by bin"
            subtitle="Times each bin was found overflowing (material outside the bin)"
            right={<SortButton options={SORTS} value={sortKey} onChange={setSortKey} />}
        >
            <HorizontalBarChart labelHeader="Building – Bin ID" valueHeader="Overflows" rows={rows} />
        </ChartCard>
    );
}
