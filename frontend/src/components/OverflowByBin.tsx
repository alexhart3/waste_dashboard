"use client";

import { useState } from "react";
import ChartCard from "./ChartCard";
import SortButton from "./SortButton";
import HorizontalBarChart, { BarRow } from "./HorizontalBarChart";

const bins = [
    { building: "University Union",   binId: "UNION-C-01", overflows: 5 },
    { building: "Library Quad",       binId: "QUAD-L-01",  overflows: 5 },
    { building: "University Union",   binId: "UNION-L-01", overflows: 3 },
    { building: "Mendocino Hall",     binId: "MND-L-01",   overflows: 2 },
    { building: "Library Quad",       binId: "QUAD-R-01",  overflows: 1 },
    { building: "University Library", binId: "LIB-L-01",   overflows: 1 },
];

type Bin = (typeof bins)[number];

const SORTS = [
    { key: "overflows-desc", label: "Overflows: high to low", short: "Overflows ↓", compare: (a: Bin, b: Bin) => b.overflows - a.overflows },
    { key: "overflows-asc",  label: "Overflows: low to high", short: "Overflows ↑", compare: (a: Bin, b: Bin) => a.overflows - b.overflows },
    { key: "building",       label: "Building: A–Z",          short: "Building",    compare: (a: Bin, b: Bin) => a.building.localeCompare(b.building) },
    { key: "bin",            label: "Bin ID: A–Z",            short: "Bin ID",      compare: (a: Bin, b: Bin) => a.binId.localeCompare(b.binId) },
];

export default function OverflowByBin() {
    const [sortKey, setSortKey] = useState("overflows-desc");
    const sort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
    const sorted = [...bins].sort(sort.compare);

    const rows: BarRow[] = sorted.map((b) => ({
        label: (
            <>
                {b.building} – <span className="mono">{b.binId}</span>
            </>
        ),
        segments: [{ label: "Overflows", value: b.overflows, color: "var(--crit)" }],
    }));

    return (
        <ChartCard
        title="Overflow by bin"
        subtitle="Times each bin was found overflowing (material outside the bin)"
        right={<SortButton options={SORTS} value={sortKey} onChange={setSortKey} />}
        >
            <HorizontalBarChart
                labelHeader="Building – Bin ID"
                valueHeader="Overflows"
                rows={rows}
            />
        </ChartCard>
    );
}